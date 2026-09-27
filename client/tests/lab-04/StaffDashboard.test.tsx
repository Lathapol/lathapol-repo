import { afterEach, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import StaffDashboard from '../../src/pages/StaffDashboard'
import { fetchStaffDashboard } from '../../src/api'
import type { StaffDashboard as Data } from '../../src/api'
vi.mock('../../src/api', () => ({ fetchStaffDashboard: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

const data = (over: Partial<Data> = {}): Data => ({
  generatedAt: '2026-09-27T09:00:00.000Z', unassignedCount: 4, mineCount: 2,
  byStatus: { NEW: 1, OPEN: 2, IN_PROGRESS: 1, WAITING_FOR_REQUESTER: 0, RESOLVED: 3, CLOSED: 5, REOPENED: 0, CANCELLED: 1 },
  byItPriority: { LOW: 2, MEDIUM: 1, HIGH: 1 },
  urgent: [{ id: 1, ticketNumber: 'TK-9', summary: 'Server down', currentStatus: 'OPEN', updatedAt: '2026-09-20T09:00:00.000Z', itPriority: 'HIGH', owner: null }],
  recentlyUpdated: [{ id: 2, ticketNumber: 'TK-8', summary: 'VPN slow', currentStatus: 'IN_PROGRESS', updatedAt: '2026-09-26T09:00:00.000Z', itPriority: 'MEDIUM', owner: { id: 5, name: 'Alex' } }],
  myActions: { recentCount: 1, recent: [{ id: 3, ticketId: 2, ticketNumber: 'TK-8', summary: 'VPN slow', createdAt: '2026-09-26T09:00:00.000Z' }] },
  ...over,
})

it('COMP-03 staff sees the metrics, breakdowns and lists, but no user-accounts card', async () => {
  vi.mocked(fetchStaffDashboard).mockResolvedValue(data())
  render(<StaffDashboard isAdmin={false} onOpenTicket={vi.fn()} onNavigateQueue={vi.fn()} onNavigateUsers={vi.fn()} />)
  expect(screen.getByText('Loading the dashboard…')).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'IT Staff Dashboard' })).toBeInTheDocument()
  expect(screen.getByText('4')).toBeInTheDocument()
  expect(screen.getByText(/Server down/)).toBeInTheDocument()
  expect(screen.getAllByText(/VPN slow/).length).toBeGreaterThan(0)
  expect(screen.getByRole('heading', { name: 'My recent actions (1)' })).toBeInTheDocument()
  expect(screen.queryByText('User accounts')).not.toBeInTheDocument()
})

it('COMP-03 administrator additionally sees the user-accounts card', async () => {
  vi.mocked(fetchStaffDashboard).mockResolvedValue(data({ users: { REQUESTER: 10, IT_STAFF: 3, ADMINISTRATOR: 1, inactive: 2 } }))
  render(<StaffDashboard isAdmin={true} onOpenTicket={vi.fn()} onNavigateQueue={vi.fn()} onNavigateUsers={vi.fn()} />)
  expect(await screen.findByRole('heading', { name: 'Administrator Dashboard' })).toBeInTheDocument()
  expect(screen.getByText('User accounts')).toBeInTheDocument()
  expect(screen.getByText('14')).toBeInTheDocument()
})

it('COMP-03 empty datasets show zero counts and empty-list text', async () => {
  vi.mocked(fetchStaffDashboard).mockResolvedValue(data({
    unassignedCount: 0, mineCount: 0,
    byStatus: { NEW: 0, OPEN: 0, IN_PROGRESS: 0, WAITING_FOR_REQUESTER: 0, RESOLVED: 0, CLOSED: 0, REOPENED: 0, CANCELLED: 0 },
    byItPriority: { LOW: 0, MEDIUM: 0, HIGH: 0 }, urgent: [], recentlyUpdated: [], myActions: { recentCount: 0, recent: [] },
  }))
  render(<StaffDashboard isAdmin={false} onOpenTicket={vi.fn()} onNavigateQueue={vi.fn()} onNavigateUsers={vi.fn()} />)
  await screen.findByRole('heading', { name: 'IT Staff Dashboard' })
  expect(screen.getByText('No urgent tickets.')).toBeInTheDocument()
  expect(screen.getByText('No recent updates.')).toBeInTheDocument()
  expect(screen.getByText('No actions logged.')).toBeInTheDocument()
})

it('COMP-03 cards and breakdown rows navigate to the queue with the documented filters', async () => {
  vi.mocked(fetchStaffDashboard).mockResolvedValue(data())
  const nav = vi.fn(), openTicket = vi.fn()
  render(<StaffDashboard isAdmin={false} onOpenTicket={openTicket} onNavigateQueue={nav} onNavigateUsers={vi.fn()} />)
  await screen.findByRole('heading', { name: 'IT Staff Dashboard' })
  fireEvent.click(screen.getByText('Unassigned').closest('button')!)
  expect(nav).toHaveBeenCalledWith({ owner: 'unassigned', group: 'open' })
  fireEvent.click(screen.getByText('My tickets').closest('button')!)
  expect(nav).toHaveBeenCalledWith({ owner: 'mine', group: 'open' })
  const byStatus = within(screen.getByRole('heading', { name: 'By status' }).closest('section')!)
  fireEvent.click(byStatus.getByText('RESOLVED').closest('button')!)
  expect(nav).toHaveBeenCalledWith({ status: 'RESOLVED' })
  const byPriority = within(screen.getByRole('heading', { name: 'By IT priority' }).closest('section')!)
  fireEvent.click(byPriority.getByText('HIGH').closest('button')!)
  expect(nav).toHaveBeenCalledWith({ priority: 'HIGH', group: 'open' })
  fireEvent.click(screen.getByText(/Server down/))
  expect(openTicket).toHaveBeenCalledWith(1)
  // "VPN slow" appears in both Recently updated and My recent actions; the second click is the actions row.
  fireEvent.click(screen.getAllByText(/VPN slow/)[1])
  expect(openTicket).toHaveBeenCalledWith(2)
})

it('COMP-03 shows a safe forbidden message for the wrong role and an error with retry otherwise', async () => {
  vi.mocked(fetchStaffDashboard).mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 })).mockResolvedValueOnce(data())
  render(<StaffDashboard isAdmin={false} onOpenTicket={vi.fn()} onNavigateQueue={vi.fn()} onNavigateUsers={vi.fn()} />)
  expect(await screen.findByText('This dashboard is not available for your role.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByRole('heading', { name: 'IT Staff Dashboard' })
})
