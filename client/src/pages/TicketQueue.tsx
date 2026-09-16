import { useEffect, useState } from 'react'
import { fetchQueue, fetchOwners, fetchCategories } from '../api'
import type { QueueResponse, QueueOwner, Category, QueueTicket } from '../api'

const defaults = { search: '', status: '', priority: '', owner: 'all', category: '', sort: 'createdAt', order: 'desc', page: '1', pageSize: '10' }
const statuses = ['NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','RESOLVED','CLOSED','REOPENED','CANCELLED']
const label = (text: string) => text.replaceAll('_', ' ')

export default function TicketQueue({ onOpenTicket }: { onOpenTicket: (id: number) => void }) {
  const [draft, setDraft] = useState(defaults)
  const [query, setQuery] = useState(defaults)
  const [data, setData] = useState<QueueResponse | null>(null)
  const [owners, setOwners] = useState<QueueOwner[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let current = true
    setLoading(true); setError('')
    Promise.all([fetchQueue(query), fetchOwners(), fetchCategories()]).then(([result, people, options]) => {
      if (current) { setData(result); setOwners(people); setCategories(options) }
    }).catch((err: { status?: number }) => {
      if (current) setError(err.status === 403 ? 'You do not have access to the ticket queue.' : 'Unable to load the queue. Please retry.')
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [query, retry])
  const filtered = !!(query.search || query.status || query.priority || query.category || query.owner !== 'all')
  const select = (key: keyof typeof defaults, title: string, options: [string, string][]) => <label className="queue-field">{title}<select className="form-select" value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })}>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
  const badges = (ticket: QueueTicket) => <><span className="queue-badge">{ticket.itPriority}</span> <span className="queue-badge">{label(ticket.currentStatus)}</span></>
  const open = (ticket: QueueTicket) => <button className="btn btn-outline-success" aria-label={`Open ${ticket.ticketNumber}`} onClick={() => onOpenTicket(ticket.id)}>Open</button>
  return <main className="container queue-page py-4">
    <h1>Ticket Queue</h1><p>Find and review support tickets across the team.</p>
    <form className="queue-filters card p-3" onSubmit={e => { e.preventDefault(); setQuery({ ...draft, page: '1' }) }}>
      <label className="queue-search queue-field">Search<input className="form-control" maxLength={200} placeholder="Ticket number or summary" value={draft.search} onChange={e => setDraft({ ...draft, search: e.target.value })}/></label>
      {select('status', 'Status', [['','All statuses'], ...statuses.map(s => [s,label(s)] as [string,string])])}
      {select('priority', 'IT priority', [['','All priorities'], ...['LOW','MEDIUM','HIGH'].map(s => [s,s] as [string,string])])}
      {select('owner', 'Owner', [['all','All owners'],['mine','Assigned to me'],['unassigned','Unassigned'], ...owners.map(o => [String(o.id),o.name] as [string,string])])}
      {select('category', 'Category', [['','All categories'], ...categories.map(c => [String(c.id),c.name] as [string,string])])}
      {select('sort', 'Sort by', [['createdAt','Created date'],['updatedAt','Last updated'],['ticketNumber','Ticket number'],['itPriority','IT priority']])}
      {select('order', 'Order', [['desc','Descending'],['asc','Ascending']])}
      {select('pageSize', 'Per page', [['10','10'],['25','25'],['50','50']])}
      <div className="queue-actions"><button className="btn btn-success" type="submit">Apply filters</button><button className="btn btn-outline-secondary" type="button" onClick={() => { setDraft(defaults); setQuery({ ...defaults }) }}>Reset</button></div>
    </form>
    {loading ? <p role="status" className="py-4">Loading tickets…</p> : error ? <div className="alert alert-danger mt-3"><p role="alert">{error}</p><button className="btn btn-outline-dark" onClick={() => setRetry(retry + 1)}>Retry</button></div> : data && <>
      <p role="status" className="mt-4">{data.meta.totalCount} tickets</p>
      {!data.data.length ? <div className="card p-4">{filtered ? 'No tickets match these filters. Try changing or resetting them.' : 'No tickets yet.'}</div> : <>
        <table className="table queue-table"><caption className="visually-hidden">Support ticket queue</caption><thead><tr>{['Ticket / summary','Requester','Owner','IT priority / status','Updated','Action'].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{data.data.map(t => <tr key={t.id}><td><strong>{t.ticketNumber}</strong><div>{t.summary}</div></td><td>{t.requester.name}</td><td>{t.owner?.name || 'Unassigned'}</td><td>{badges(t)}</td><td>{new Date(t.updatedAt).toLocaleString()}</td><td>{open(t)}</td></tr>)}</tbody></table>
        <div className="queue-cards">{data.data.map(t => <article className="card p-3" key={t.id}><h2 className="h5">{t.ticketNumber}</h2><p>{t.summary}</p><p>{badges(t)}</p><p>Requester: {t.requester.name}<br/>Owner: {t.owner?.name || 'Unassigned'}<br/>Updated: {new Date(t.updatedAt).toLocaleString()}</p>{open(t)}</article>)}</div>
      </>}
      <nav className="queue-pagination" aria-label="Queue pages"><button className="btn btn-outline-success" disabled={data.meta.page <= 1} onClick={() => setQuery({ ...query, page: String(data.meta.page - 1) })}>Previous</button><span>Page {data.meta.page} of {data.meta.totalPages}</span><button className="btn btn-outline-success" disabled={data.meta.page >= data.meta.totalPages} onClick={() => setQuery({ ...query, page: String(data.meta.page + 1) })}>Next</button></nav>
    </>}
  </main>
}
