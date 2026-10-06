import { useEffect, useState } from 'react'
import { fetchStaffDashboard } from '../api'
import type { StaffDashboard as StaffDashboardData, StaffDashboardTicketRow } from '../api'

export type QueueFilter = Record<string, string>

interface Props {
  isAdmin: boolean
  onOpenTicket: (id: number) => void
  onNavigateQueue: (filter?: QueueFilter) => void
  onNavigateUsers: () => void
}

const label = (text: string) => text.replaceAll('_', ' ')
const statuses = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED']

function TicketList({ rows, empty, onOpenTicket }: { rows: StaffDashboardTicketRow[]; empty: string; onOpenTicket: (id: number) => void }) {
  if (!rows.length) return <p>{empty}</p>
  return <ul className="dashboard-list">{rows.map(t => <li key={t.id}>
    <button className="btn btn-link dashboard-row" onClick={() => onOpenTicket(t.id)}>
      <strong>{t.ticketNumber}</strong> {t.summary} <span className="queue-badge">{t.itPriority}</span> <span className="queue-badge">{label(t.currentStatus)}</span>
      <span className="dashboard-row-time"> Owner: {t.owner?.name || 'Unassigned'} · Updated {new Date(t.updatedAt).toLocaleString()}</span>
    </button>
  </li>)}</ul>
}

export default function StaffDashboard({ isAdmin, onOpenTicket, onNavigateQueue, onNavigateUsers }: Props) {
  const [data, setData] = useState<StaffDashboardData | null>(null)
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    let current = true
    setLoading(true); setError('')
    fetchStaffDashboard().then(result => { if (current) setData(result) })
      .catch((e: { status?: number }) => { if (current) setError(e.status === 403 ? 'This dashboard is not available for your role.' : 'Unable to load the dashboard. Please retry.') })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [retry])

  if (loading) return <main className="container py-4"><p role="status">Loading the dashboard…</p></main>
  if (error) return <main className="container py-4"><div role="alert"><p>{error}</p><button className="btn btn-outline-secondary" onClick={() => setRetry(retry + 1)}>Retry</button></div></main>
  if (!data) return null

  return <main className="container dashboard-page py-4">
    <h1>{isAdmin ? 'Administrator Dashboard' : 'IT Staff Dashboard'}</h1>
    <p className="text-muted">As of {new Date(data.generatedAt).toLocaleString()}</p>
    <div className="dashboard-cards">
      <button className="dashboard-card" onClick={() => onNavigateQueue({ owner: 'unassigned', group: 'open' })}>
        <span className="dashboard-card-label">Unassigned</span><span className="dashboard-card-value">{data.unassignedCount}</span><span>View</span>
      </button>
      <button className="dashboard-card" onClick={() => onNavigateQueue({ owner: 'mine', group: 'open' })}>
        <span className="dashboard-card-label">My tickets</span><span className="dashboard-card-value">{data.mineCount}</span><span>View</span>
      </button>
      {isAdmin && <button className="dashboard-card" onClick={onNavigateUsers}>
        <span className="dashboard-card-label">User accounts</span>
        <span className="dashboard-card-value">{(data.users?.REQUESTER ?? 0) + (data.users?.IT_STAFF ?? 0) + (data.users?.ADMINISTRATOR ?? 0)}</span>
        <span>{data.users?.inactive ?? 0} inactive · View</span>
      </button>}
    </div>
    <section className="card p-3 mb-4">
      <h2 className="h4">By status</h2>
      <ul className="dashboard-breakdown">{statuses.map(s => <li key={s}>
        <button className="btn btn-link dashboard-row" onClick={() => onNavigateQueue({ status: s })}>{label(s)}<span className="dashboard-card-value">{data.byStatus[s] ?? 0}</span></button>
      </li>)}</ul>
    </section>
    <section className="card p-3 mb-4">
      <h2 className="h4">By IT priority</h2>
      <ul className="dashboard-breakdown">{['LOW', 'MEDIUM', 'HIGH'].map(p => <li key={p}>
        <button className="btn btn-link dashboard-row" onClick={() => onNavigateQueue({ priority: p, group: 'open' })}>{p}<span className="dashboard-card-value">{data.byItPriority[p] ?? 0}</span></button>
      </li>)}</ul>
    </section>
    <section className="card p-3 mb-4"><h2 className="h4">Urgent tickets</h2><TicketList rows={data.urgent} empty="No urgent tickets." onOpenTicket={onOpenTicket} /></section>
    <section className="card p-3 mb-4"><h2 className="h4">Recently updated</h2><TicketList rows={data.recentlyUpdated} empty="No recent updates." onOpenTicket={onOpenTicket} /></section>
    <section className="card p-3 mb-4">
      <h2 className="h4">My recent actions ({data.myActions.recentCount})</h2>
      {!data.myActions.recent.length ? <p>No actions logged.</p> : <ul className="dashboard-list">{data.myActions.recent.map(a => <li key={a.id}>
        <button className="btn btn-link dashboard-row" onClick={() => onOpenTicket(a.ticketId)}>
          <strong>{a.ticketNumber}</strong> {a.summary}<span className="dashboard-row-time"> Logged {new Date(a.createdAt).toLocaleString()}</span>
        </button>
      </li>)}</ul>}
    </section>
  </main>
}
