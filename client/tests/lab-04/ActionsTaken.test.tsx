import { afterEach, beforeEach, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import ActionsTaken from '../../src/components/ActionsTaken'
import { createAction, fetchActions, updateAction } from '../../src/api'
import type { ActionTaken } from '../../src/api'
vi.mock('../../src/api', () => ({ fetchActions: vi.fn(), createAction: vi.fn(), updateAction: vi.fn() }))

const action = (over: Partial<ActionTaken> = {}): ActionTaken => ({
  id: 1, ticketId: 5, description: 'Reset the mailbox', result: 'Mailbox works again', followUpRequired: false, followUpNote: null,
  attachmentNotes: null, version: 0, createdAt: '2026-09-01T09:00:00.000Z', updatedAt: '2026-09-01T09:00:00.000Z', performedBy: { id: 2, name: 'Alex Chen' }, ...over,
})
beforeEach(() => { vi.mocked(fetchActions).mockResolvedValue([]) })
afterEach(() => { cleanup(); vi.resetAllMocks() })

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

it('COMP-01 lists actions with performer, follow-up and attachment notes, and shows the empty state', async () => {
  vi.mocked(fetchActions).mockResolvedValue([action(), action({ id: 2, description: 'Second step', followUpRequired: true, followUpNote: 'Call back Friday', attachmentNotes: 'see screenshot.png', performedBy: { id: 3, name: 'Morgan Lee' } })])
  render(<ActionsTaken ticketId={5} role="IT_STAFF" ticketStatus="IN_PROGRESS" />)
  expect(await screen.findByText('Reset the mailbox')).toBeInTheDocument()
  expect(screen.getByText('Alex Chen')).toBeInTheDocument()
  expect(screen.getByText('Morgan Lee')).toBeInTheDocument()
  expect(screen.getByText('Yes: Call back Friday')).toBeInTheDocument()
  expect(screen.getByText('see screenshot.png')).toBeInTheDocument()
  expect(fetchActions).toHaveBeenCalledWith(5)
  cleanup()
  vi.mocked(fetchActions).mockResolvedValue([])
  render(<ActionsTaken ticketId={5} role="IT_STAFF" ticketStatus="IN_PROGRESS" />)
  expect(await screen.findByText('No actions recorded yet.')).toBeInTheDocument()
})

it('COMP-01 requester sees the list read-only, with no add or edit controls', async () => {
  vi.mocked(fetchActions).mockResolvedValue([action()])
  render(<ActionsTaken ticketId={5} role="REQUESTER" ticketStatus="OPEN" />)
  expect(await screen.findByText('Reset the mailbox')).toBeInTheDocument()
  expect(screen.getByText(/read-only/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Add action' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Edit action/ })).not.toBeInTheDocument()
})

it('COMP-01 create mode validates inline, requires the follow-up note, and posts the trimmed input with a request key', async () => {
  vi.mocked(createAction).mockResolvedValue(action({ id: 9, description: 'Swapped the cable', result: 'Link is up' }))
  render(<ActionsTaken ticketId={5} role="IT_STAFF" ticketStatus="OPEN" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Add action' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save action' }))
  expect(screen.getByText('Enter a description of 1 to 2000 characters.')).toBeInTheDocument()
  expect(screen.getByLabelText('Action description')).toHaveAttribute('aria-invalid', 'true')
  expect(createAction).not.toHaveBeenCalled()
  fill('Action description', '  Swapped the cable  '); fill('Result', 'Link is up')
  expect(screen.getByLabelText(/Follow-up note/)).toBeDisabled()
  fireEvent.click(screen.getByLabelText('Follow-up required'))
  fireEvent.click(screen.getByRole('button', { name: 'Save action' }))
  expect(screen.getByText(/Enter a follow-up note/)).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Follow-up required'))
  fireEvent.click(screen.getByRole('button', { name: 'Save action' }))
  await waitFor(() => expect(createAction).toHaveBeenCalledTimes(1))
  const [ticketId, key, input] = vi.mocked(createAction).mock.calls[0]
  expect(ticketId).toBe(5)
  expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  expect(input).toEqual({ description: 'Swapped the cable', result: 'Link is up', followUpRequired: false, followUpNote: null, attachmentNotes: null })
  expect(await screen.findByText('Action added.')).toBeInTheDocument()
  expect(screen.getByText('Swapped the cable')).toBeInTheDocument()
  expect(screen.queryByRole('form', { name: 'Add action' })).not.toBeInTheDocument()
})

it('COMP-01 keeps the entered text and the same request key after a failed save, so a retry cannot duplicate', async () => {
  vi.mocked(createAction).mockRejectedValueOnce(new Error('Network down')).mockResolvedValueOnce(action({ id: 9 }))
  render(<ActionsTaken ticketId={5} role="IT_STAFF" ticketStatus="OPEN" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Add action' }))
  fill('Action description', 'Kept text'); fill('Result', 'Kept result')
  fireEvent.click(screen.getByRole('button', { name: 'Save action' }))
  expect(await screen.findByText(/Network down/)).toBeInTheDocument()
  expect(screen.getByLabelText('Action description')).toHaveValue('Kept text')
  expect(screen.getByRole('button', { name: 'Save action' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Save action' }))
  await waitFor(() => expect(createAction).toHaveBeenCalledTimes(2))
  expect(vi.mocked(createAction).mock.calls[0][1]).toBe(vi.mocked(createAction).mock.calls[1][1])
})

it('COMP-01 disables the form while saving so a double click sends one request', async () => {
  let finish: (a: ActionTaken) => void = () => {}
  vi.mocked(createAction).mockReturnValue(new Promise<ActionTaken>(resolve => { finish = resolve }))
  render(<ActionsTaken ticketId={5} role="IT_STAFF" ticketStatus="OPEN" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Add action' }))
  fill('Action description', 'One'); fill('Result', 'Done')
  fireEvent.click(screen.getByRole('button', { name: 'Save action' }))
  expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Saving…' }))
  expect(createAction).toHaveBeenCalledTimes(1)
  finish(action({ id: 9, description: 'One' }))
  await screen.findByText('Action added.')
})

it('COMP-01 edit mode shows performer and date read-only, sends the current version, and updates the row', async () => {
  vi.mocked(fetchActions).mockResolvedValue([action({ version: 3 })])
  vi.mocked(updateAction).mockResolvedValue(action({ version: 4, result: 'Confirmed with the user' }))
  render(<ActionsTaken ticketId={5} role="ADMINISTRATOR" ticketStatus="RESOLVED" />)
  fireEvent.click(await screen.findByRole('button', { name: /Edit action by Alex Chen/ }))
  const form = screen.getByRole('form', { name: 'Edit action' })
  expect(within(form).getByText(/Performed by Alex Chen/)).toBeInTheDocument()
  expect(within(form).getByLabelText('Action description')).toHaveValue('Reset the mailbox')
  fill('Result', 'Confirmed with the user')
  fireEvent.click(screen.getByRole('button', { name: 'Save action' }))
  await waitFor(() => expect(updateAction).toHaveBeenCalledWith(1, 3, expect.objectContaining({ result: 'Confirmed with the user' })))
  expect(await screen.findByText('Confirmed with the user')).toBeInTheDocument()
  expect(screen.getByText('Action updated.')).toBeInTheDocument()
})

it('COMP-01 a stale edit shows the conflict, keeps the draft, and offers to reload the actions', async () => {
  vi.mocked(fetchActions).mockResolvedValue([action()])
  vi.mocked(updateAction).mockRejectedValue(Object.assign(new Error('This action changed. Reload it before saving again.'), { status: 409 }))
  render(<ActionsTaken ticketId={5} role="IT_STAFF" ticketStatus="OPEN" />)
  fireEvent.click(await screen.findByRole('button', { name: /Edit action by/ }))
  fill('Result', 'My edit')
  fireEvent.click(screen.getByRole('button', { name: 'Save action' }))
  expect(await screen.findByText(/This action changed/)).toBeInTheDocument()
  expect(screen.getByLabelText('Result')).toHaveValue('My edit')
  fireEvent.click(screen.getByRole('button', { name: 'Reload actions' }))
  await waitFor(() => expect(fetchActions).toHaveBeenCalledTimes(2))
})

it('COMP-01 closed and cancelled tickets hide the write controls and explain why', async () => {
  vi.mocked(fetchActions).mockResolvedValue([action()])
  render(<ActionsTaken ticketId={5} role="IT_STAFF" ticketStatus="CLOSED" />)
  expect(await screen.findByText('Reset the mailbox')).toBeInTheDocument()
  expect(screen.getByText(/closed or cancelled/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Add action' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Edit action/ })).not.toBeInTheDocument()
})

it('COMP-01 shows a safe load failure with a retry', async () => {
  vi.mocked(fetchActions).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([action()])
  render(<ActionsTaken ticketId={5} role="IT_STAFF" ticketStatus="OPEN" />)
  expect(await screen.findByText('Unable to load actions taken. Please retry.')).toBeInTheDocument()
  expect(screen.queryByText('boom')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Reload actions' }))
  expect(await screen.findByText('Reset the mailbox')).toBeInTheDocument()
})
