import { afterEach, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import RequesterDashboard from '../../src/pages/RequesterDashboard'
import { fetchRequesterDashboard } from '../../src/api'
import type { RequesterDashboard as Data } from '../../src/api'
vi.mock('../../src/api', () => ({ fetchRequesterDashboard: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

const data = (over: Partial<Data> = {}): Data => ({
  generatedAt: '2026-09-27T09:00:00.000Z', openCount: 3, waitingCount: 1, recentlyResolvedCount: 2,
  recentlyUpdated: [{ id: 1, ticketNumber: 'TK-1', summary: 'Printer jam', currentStatus: 'OPEN', updatedAt: '2026-09-26T09:00:00.000Z' }],
  recentlyResolved: [{ id: 2, ticketNumber: 'TK-2', summary: 'VPN fixed', currentStatus: 'RESOLVED', updatedAt: '2026-09-25T09:00:00.000Z' }],
  ...over,
})

it('COMP-04 shows a loading state, then the counts, badge and lists', async () => {
  vi.mocked(fetchRequesterDashboard).mockResolvedValue(data())
  render(<RequesterDashboard onOpenTicket={vi.fn()} onNavigateMyTickets={vi.fn()} />)
  expect(screen.getByText('Loading your dashboard…')).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'My Dashboard' })).toBeInTheDocument()
  expect(screen.getByText('3')).toBeInTheDocument()
  expect(screen.getByText('Needs your attention')).toBeInTheDocument()
  expect(screen.getByText(/Printer jam/)).toBeInTheDocument()
  expect(screen.getByText(/VPN fixed/)).toBeInTheDocument()
})

it('COMP-04 hides the attention badge when nothing is waiting, and shows empty-list text', async () => {
  vi.mocked(fetchRequesterDashboard).mockResolvedValue(data({ waitingCount: 0, recentlyUpdated: [], recentlyResolved: [] }))
  render(<RequesterDashboard onOpenTicket={vi.fn()} onNavigateMyTickets={vi.fn()} />)
  await screen.findByRole('heading', { name: 'My Dashboard' })
  expect(screen.queryByText('Needs your attention')).not.toBeInTheDocument()
  expect(screen.getByText('No recent updates.')).toBeInTheDocument()
  expect(screen.getByText('Nothing resolved recently.')).toBeInTheDocument()
})

it('COMP-04 zero tickets shows zero everywhere, not an error', async () => {
  vi.mocked(fetchRequesterDashboard).mockResolvedValue(data({ openCount: 0, waitingCount: 0, recentlyResolvedCount: 0, recentlyUpdated: [], recentlyResolved: [] }))
  render(<RequesterDashboard onOpenTicket={vi.fn()} onNavigateMyTickets={vi.fn()} />)
  await screen.findByRole('heading', { name: 'My Dashboard' })
  expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3)
})

it('COMP-04 the Open tickets card navigates with group=open and a row opens its ticket', async () => {
  vi.mocked(fetchRequesterDashboard).mockResolvedValue(data())
  const nav = vi.fn(), open = vi.fn()
  render(<RequesterDashboard onOpenTicket={open} onNavigateMyTickets={nav} />)
  await screen.findByRole('heading', { name: 'My Dashboard' })
  fireEvent.click(screen.getByText('Open tickets').closest('button')!)
  expect(nav).toHaveBeenCalledWith({ group: 'open' })
  fireEvent.click(screen.getAllByText('Recently resolved')[0].closest('button')!)
  expect(nav).toHaveBeenCalledWith({ group: 'resolved', recent: '7d' })
  fireEvent.click(screen.getByText('Waiting for you').closest('button')!)
  expect(nav).toHaveBeenCalledWith({ status: 'WAITING_FOR_REQUESTER' })
  fireEvent.click(screen.getByText(/Printer jam/))
  expect(open).toHaveBeenCalledWith(1)
})

it('COMP-04 shows a safe forbidden message for the wrong role and an error with retry otherwise', async () => {
  vi.mocked(fetchRequesterDashboard).mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 })).mockResolvedValueOnce(data())
  render(<RequesterDashboard onOpenTicket={vi.fn()} onNavigateMyTickets={vi.fn()} />)
  expect(await screen.findByText('This dashboard is not available for your role.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByRole('heading', { name: 'My Dashboard' })
})

it('COMP-04 shows a generic safe failure and retry on a network error', async () => {
  vi.mocked(fetchRequesterDashboard).mockRejectedValue(new Error('boom'))
  render(<RequesterDashboard onOpenTicket={vi.fn()} onNavigateMyTickets={vi.fn()} />)
  expect(await screen.findByText('Unable to load your dashboard. Please retry.')).toBeInTheDocument()
  expect(screen.queryByText('boom')).not.toBeInTheDocument()
})
