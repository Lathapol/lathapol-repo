import { useEffect, useState } from 'react'
import { fetchRequesterDashboard } from '../api'
import type { DashboardTicketRow, RequesterDashboard as RequesterDashboardData } from '../api'

export type MyTicketsFilter = { status?: string; group?: string; recent?: string }

interface Props {
  onOpenTicket: (id: number) => void
  onNavigateMyTickets: (filter?: MyTicketsFilter) => void
}

const label = (text: string) => text.replaceAll('_', ' ')

function TicketList({ rows, empty, onOpenTicket }: { rows: DashboardTicketRow[]; empty: string; onOpenTicket: (id: number) => void }) {
  if (!rows.length) return <p>{empty}</p>
  return <ul className="dashboard-list">{rows.map(t => <li key={t.id}>
    <button className="btn btn-link dashboard-row" onClick={() => onOpenTicket(t.id)}>
      <strong>{t.ticketNumber}</strong> {t.summary} <span className="queue-badge">{label(t.currentStatus)}</span>
      <span className="dashboard-row-time"> Updated {new Date(t.updatedAt).toLocaleString()}</span>
    </button>
  </li>)}</ul>
}

export default function RequesterDashboard({ onOpenTicket, onNavigateMyTickets }: Props) {
  const [data, setData] = useState<RequesterDashboardData | null>(null)
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    let current = true
    setLoading(true); setError('')
    fetchRequesterDashboard().then(result => { if (current) setData(result) })
      .catch((e: { status?: number }) => { if (current) setError(e.status === 403 ? 'This dashboard is not available for your role.' : 'Unable to load your dashboard. Please retry.') })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [retry])

  if (loading) return <main className="container py-4"><p role="status">Loading your dashboard…</p></main>
  if (error) return <main className="container py-4"><div role="alert"><p>{error}</p><button className="btn btn-outline-secondary" onClick={() => setRetry(retry + 1)}>Retry</button></div></main>
  if (!data) return null

  return <main className="container dashboard-page py-4">
    <h1>My Dashboard</h1>
    <p className="text-muted">As of {new Date(data.generatedAt).toLocaleString()}</p>
    <div className="dashboard-cards">
      <button className="dashboard-card" onClick={() => onNavigateMyTickets({ group: 'open' })}>
        <span className="dashboard-card-label">Open tickets</span><span className="dashboard-card-value">{data.openCount}</span><span>View</span>
      </button>
      <button className="dashboard-card" onClick={() => onNavigateMyTickets({ status: 'WAITING_FOR_REQUESTER' })}>
        <span className="dashboard-card-label">Waiting for you</span><span className="dashboard-card-value">{data.waitingCount}</span>
        {data.waitingCount > 0 && <span className="queue-badge dashboard-attention">Needs your attention</span>}<span>View</span>
      </button>
      <button className="dashboard-card" onClick={() => onNavigateMyTickets({ group: 'resolved', recent: '7d' })}>
        <span className="dashboard-card-label">Recently resolved</span><span className="dashboard-card-value">{data.recentlyResolvedCount}</span><span>View</span>
      </button>
    </div>
    <section className="card p-3 mb-4"><h2 className="h4">Recently updated</h2><TicketList rows={data.recentlyUpdated} empty="No recent updates." onOpenTicket={onOpenTicket} /></section>
    <section className="card p-3 mb-4"><h2 className="h4">Recently resolved</h2><TicketList rows={data.recentlyResolved} empty="Nothing resolved recently." onOpenTicket={onOpenTicket} /></section>
  </main>
}
