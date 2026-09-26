import { afterEach, beforeEach, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import TicketActivity from '../../src/components/TicketActivity'
import { fetchActions, fetchEntries, fetchOwners, updateWorkflow, appearsResolved } from '../../src/api'
import type { ActionTaken, TicketDetail } from '../../src/api'
vi.mock('../../src/api', () => ({ fetchActions: vi.fn(), fetchEntries: vi.fn(), fetchOwners: vi.fn(), postEntry: vi.fn(), updateWorkflow: vi.fn(), appearsResolved: vi.fn(), createAction: vi.fn(), updateAction: vi.fn() }))

const ticket = (currentStatus: string): TicketDetail => ({ id: 1, ticketNumber: 'TK1', summary: 'Broken printer', description: 'Printer is unavailable', category: 'Hardware', relatedSystem: 'Printing', requestedPriority: 'LOW', itPriority: 'HIGH', currentStatus, version: 3, ownerId: null, owner: null, requester: { name: 'Jane' }, createdAt: '2026-01-01', updatedAt: '2026-01-01', attachments: [] } as TicketDetail)
const oneAction: ActionTaken = { id: 1, ticketId: 1, description: 'Replaced the toner', result: 'Prints again', followUpRequired: false, followUpNote: null, attachmentNotes: null, version: 0, createdAt: '2026-01-01', updatedAt: '2026-01-01', performedBy: { id: 2, name: 'Alex' } }
beforeEach(() => {
  vi.mocked(fetchActions).mockResolvedValue([oneAction]); vi.mocked(fetchEntries).mockResolvedValue([]); vi.mocked(fetchOwners).mockResolvedValue([])
  vi.mocked(updateWorkflow).mockResolvedValue({}); vi.mocked(appearsResolved).mockResolvedValue({})
})
afterEach(() => { cleanup(); vi.resetAllMocks() })

const statusOptions = () => Array.from((screen.getByLabelText('Change status') as HTMLSelectElement).options).map(o => o.value)

it.each([
  ['NEW', ['', 'OPEN', 'CANCELLED']],
  ['OPEN', ['', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED']],
  ['WAITING_FOR_REQUESTER', ['', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED']],
  ['RESOLVED', ['', 'CLOSED', 'REOPENED']],
  ['REOPENED', ['', 'OPEN', 'IN_PROGRESS', 'CANCELLED']],
  ['CLOSED', ['']],
  ['CANCELLED', ['']],
])('COMP-02 from %s the status control offers only the permitted next statuses', async (from, expected) => {
  render(<TicketActivity ticket={ticket(from)} role="IT_STAFF" onRefresh={vi.fn()} />)
  await screen.findByText('Replaced the toner')
  expect(statusOptions()).toEqual(expected)
})

it('COMP-02 with no action taken, choosing Resolved shows the hint and blocks saving', async () => {
  vi.mocked(fetchActions).mockResolvedValue([])
  render(<TicketActivity ticket={ticket('OPEN')} role="IT_STAFF" onRefresh={vi.fn()} />)
  await screen.findByText('No actions recorded yet.')
  fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'RESOLVED' } })
  expect(screen.getByText(/Log an action first/)).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Confirm changing status to RESOLVED'))
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  expect(updateWorkflow).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'IN_PROGRESS' } })
  expect(screen.queryByText(/Log an action first/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
})

it('COMP-02 with an action, resolving needs confirmation, sends the version and refreshes the ticket', async () => {
  const refresh = vi.fn()
  render(<TicketActivity ticket={ticket('OPEN')} role="IT_STAFF" onRefresh={refresh} />)
  await screen.findByText('Replaced the toner')
  fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'RESOLVED' } })
  expect(screen.queryByText(/Log an action first/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  fireEvent.click(screen.getByLabelText('Confirm changing status to RESOLVED'))
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(updateWorkflow).toHaveBeenCalledWith(1, { version: 3, currentStatus: 'RESOLVED', confirmed: true }))
  await waitFor(() => expect(refresh).toHaveBeenCalled())
})

it('COMP-02 shows the server gate error when the backend still rejects, and keeps the form usable', async () => {
  vi.mocked(fetchActions).mockRejectedValue(new Error('offline'))
  vi.mocked(updateWorkflow).mockRejectedValue(new Error('Add at least one action taken before resolving this ticket.'))
  render(<TicketActivity ticket={ticket('OPEN')} role="IT_STAFF" onRefresh={vi.fn()} />)
  await screen.findByText('Unable to load actions taken. Please retry.')
  fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'RESOLVED' } })
  fireEvent.click(screen.getByLabelText('Confirm changing status to RESOLVED'))
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByText('Add at least one action taken before resolving this ticket.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Reload ticket' })).toBeEnabled()
  expect(screen.getByLabelText('Change status')).toHaveValue('RESOLVED')
})

it('COMP-02 requesters have no status control; their resolved signal is labeled advisory', async () => {
  render(<TicketActivity ticket={ticket('IN_PROGRESS')} role="REQUESTER" onRefresh={vi.fn()} />)
  await screen.findByText('Replaced the toner')
  expect(screen.queryByLabelText('Change status')).not.toBeInTheDocument()
  expect(screen.getByText(/does not resolve or close your ticket/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'This appears resolved' }))
  await waitFor(() => expect(appearsResolved).toHaveBeenCalledWith(1))
  expect(updateWorkflow).not.toHaveBeenCalled()
})

it('COMP-02 administrators see the workflow read-only', async () => {
  render(<TicketActivity ticket={ticket('OPEN')} role="ADMINISTRATOR" onRefresh={vi.fn()} />)
  await screen.findByText('Replaced the toner')
  expect(screen.queryByLabelText('Change status')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
})
