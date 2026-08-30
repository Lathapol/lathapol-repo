import { useEffect, useState } from "react"
import { useRequester } from "../context/RequesterContext"
import { fetchTickets } from "../api"
import type { TicketListItem, TicketListMeta } from "../api"

type LoadState = "loading" | "success" | "error"

interface Props {
  onCreateTicket: () => void
  onOpenTicket: (id: number) => void
}

const PAGE_SIZE = 10

export default function MyTickets({ onCreateTicket, onOpenTicket }: Props) {
  const { requester } = useRequester()

  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [tickets, setTickets] = useState<TicketListItem[]>([])
  const [meta, setMeta] = useState<TicketListMeta | null>(null)

  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [priority, setPriority] = useState("")
  const [status, setStatus] = useState("")
  const [sort, setSort] = useState("createdAt")
  const [order, setOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!requester) return
    setLoadState("loading")

    fetchTickets({
      requesterId: requester.id,
      search: search || undefined,
      priority: priority || undefined,
      status: status || undefined,
      sort,
      order,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setTickets(res.data)
        setMeta(res.meta)
        setLoadState("success")
      })
      .catch(() => setLoadState("error"))
  }, [requester, search, category, priority, status, sort, order, page])

  function handleSort(field: string) {
    if (sort === field) {
      setOrder(order === "asc" ? "desc" : "asc")
    } else {
      setSort(field)
      setOrder("desc")
    }
    setPage(1)
  }

  function handleClearFilters() {
    setSearch("")
    setCategory("")
    setPriority("")
    setStatus("")
    setSort("createdAt")
    setOrder("desc")
    setPage(1)
  }

  const hasAnyFilter = Boolean(search || category || priority || status)

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h1 className="h4 mb-1">My Tickets</h1>
          <p className="text-muted small mb-0">View and track all of your support requests.</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={handleClearFilters}>
            Clear Filters
          </button>
          <button className="btn btn-success btn-sm" onClick={onCreateTicket}>
            + Create Ticket
          </button>
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <input
            type="text"
            className="form-control"
            placeholder="Search by ticket number or summary..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="col-md-2">
          <select
            className="form-select"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-md-2">
          <select
            className="form-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
          </select>
        </div>
      </div>

      {loadState === "loading" && <p className="text-center py-5">Loading...</p>}

      {loadState === "error" && (
        <div className="alert alert-danger">
          Unable to load your tickets. Please try again later.
        </div>
      )}

      {loadState === "success" && tickets.length === 0 && !hasAnyFilter && (
        <div className="alert alert-secondary text-center py-5">
          You don't have any tickets yet. Click "Create Ticket" to submit your first request.
        </div>
      )}

      {loadState === "success" && tickets.length === 0 && hasAnyFilter && (
        <div className="alert alert-secondary text-center py-5">
          No tickets match your current search or filters.
        </div>
      )}

      {loadState === "success" && tickets.length > 0 && (
        <>
          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th role="button" onClick={() => handleSort("ticketNumber")}>
                    Ticket No.
                  </th>
                  <th role="button" onClick={() => handleSort("createdAt")}>
                    Created Date
                  </th>
                  <th>Summary</th>
                  <th>Category</th>
                  <th>Requested Priority</th>
                  <th>Current Status</th>
                  <th role="button" onClick={() => handleSort("updatedAt")}>
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} role="button" onClick={() => onOpenTicket(t.id)}>
                    <td className="fw-semibold">{t.ticketNumber}</td>
                    <td>{new Date(t.createdAt).toLocaleString()}</td>
                    <td>{t.summary}</td>
                    <td>{t.category}</td>
                    <td>
                      <span className="badge bg-warning-subtle text-dark">
                        {t.requestedPriority}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-success-subtle text-success">
                        {t.currentStatus}
                      </span>
                    </td>
                    <td>{new Date(t.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-md-none">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="card mb-2 p-3"
                role="button"
                onClick={() => onOpenTicket(t.id)}
              >
                <div className="d-flex justify-content-between">
                  <strong>{t.ticketNumber}</strong>
                  <span className="badge bg-success-subtle text-success">
                    {t.currentStatus}
                  </span>
                </div>
                <div className="text-muted small">{t.summary}</div>
                <div className="d-flex justify-content-between mt-2 small">
                  <span>{t.category}</span>
                  <span className="badge bg-warning-subtle text-dark">
                    {t.requestedPriority}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {meta && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-muted small">
                Showing {(meta.page - 1) * meta.pageSize + 1} to{" "}
                {Math.min(meta.page * meta.pageSize, meta.totalCount)} of {meta.totalCount} tickets
              </span>
              <div className="btn-group">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
