import { afterEach, beforeEach, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import TicketQueue from '../../src/pages/TicketQueue'
import { fetchQueue, fetchOwners, fetchCategories } from '../../src/api'
vi.mock('../../src/api', () => ({ fetchQueue: vi.fn(), fetchOwners: vi.fn(), fetchCategories: vi.fn() }))
const empty = { data: [], meta: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 } }
beforeEach(() => { vi.mocked(fetchOwners).mockResolvedValue([]); vi.mocked(fetchCategories).mockResolvedValue([]); vi.mocked(fetchQueue).mockResolvedValue(empty) })
afterEach(() => { cleanup(); vi.resetAllMocks() })
it('distinguishes empty queue from no matching filters and resets filters', async () => {
  render(<TicketQueue onOpenTicket={vi.fn()}/>)
  expect(await screen.findByText('No tickets yet.')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'printer' } })
  fireEvent.change(screen.getByLabelText('IT priority'), { target: { value: 'HIGH' } })
  fireEvent.change(screen.getByLabelText('Owner'), { target: { value: 'mine' } })
  fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }))
  expect(await screen.findByText(/No tickets match/)).toBeInTheDocument()
  expect(fetchQueue).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'printer', priority: 'HIGH', owner: 'mine', page: '1' }))
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  expect(await screen.findByText('No tickets yet.')).toBeInTheDocument()
})
it('shows forbidden feedback and retries a failed load', async () => {
  vi.mocked(fetchQueue).mockRejectedValueOnce({ status: 403 })
  render(<TicketQueue onOpenTicket={vi.fn()}/>)
  expect(await screen.findByRole('alert')).toHaveTextContent('do not have access')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(await screen.findByText('No tickets yet.')).toBeInTheDocument()
})
it('opens a ticket using an accessible button and requests next page', async () => {
  const open = vi.fn()
  vi.mocked(fetchQueue).mockResolvedValue({ data: [{ id: 9, ticketNumber: 'TK9', summary: 'Printer unavailable', category: 'Hardware', requestedPriority: 'LOW', itPriority: 'HIGH', currentStatus: 'OPEN', createdAt: '2026-01-01', updatedAt: '2026-01-01', requester: { id: 1, name: 'Jane' }, owner: null }], meta: { page: 1, pageSize: 10, totalCount: 11, totalPages: 2 } })
  render(<TicketQueue onOpenTicket={open}/>)
  const buttons = await screen.findAllByRole('button', { name: 'Open TK9' })
  fireEvent.click(buttons[0]); expect(open).toHaveBeenCalledWith(9)
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() => expect(fetchQueue).toHaveBeenLastCalledWith(expect.objectContaining({ page: '2' })))
})
