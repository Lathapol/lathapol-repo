import { useEffect, useState } from "react"
import {
  fetchTicketDetail,
  uploadAttachment,
  removeAttachment,
  getAttachmentDownloadUrl,
} from "../api"
import type { TicketDetail as TicketDetailType, AttachmentItem } from "../api"
import { useRequester } from "../context/RequesterContext"

type LoadState = "loading" | "success" | "error"

interface Props {
  ticketId: number
  onBack: () => void
}

export default function TicketDetail({ ticketId, onBack }: Props) {
  const { requester } = useRequester()
  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [ticket, setTicket] = useState<TicketDetailType | null>(null)
  const [uploadError, setUploadError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [removeReason, setRemoveReason] = useState("")

  function loadTicket() {
    if (!requester) return
    setLoadState("loading")
    fetchTicketDetail(ticketId, requester.id)
      .then((data) => {
        setTicket(data)
        setLoadState("success")
      })
      .catch(() => setLoadState("error"))
  }

  useEffect(() => {
    loadTicket()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!requester || !e.target.files?.[0]) return
    const file = e.target.files[0]
    setUploadError("")
    setUploading(true)

    try {
      await uploadAttachment(ticketId, requester.id, file)
      loadTicket()
    } catch (err: any) {
      setUploadError(err.message ?? "Failed to upload attachment.")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  async function handleRemove(attachmentId: number) {
    if (!requester) return
    const reason = removeReason.trim() || "No reason provided"
    try {
      await removeAttachment(attachmentId, requester.id, reason)
      setRemovingId(null)
      setRemoveReason("")
      loadTicket()
    } catch (err: any) {
      setUploadError(err.message ?? "Failed to remove attachment.")
    }
  }

  if (loadState === "loading") {
    return <p className="text-center py-5">Loading...</p>
  }

  if (loadState === "error" || !ticket) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">
          Unable to load this ticket. It may not exist or you may not have access to it.
        </div>
        <button className="btn btn-secondary" onClick={onBack}>
          Back to My Tickets
        </button>
      </div>
    )
  }

  const activeAttachments = ticket.attachments.filter((a) => !a.isRemoved)

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <button className="btn btn-link px-0 mb-3" onClick={onBack}>
        Back to My Tickets
      </button>

      <div className="card p-4 mb-4">
        <div className="row g-3">
          <div className="col-md-3">
            <label className="form-label fw-semibold small">Ticket No.</label>
            <div className="p-2" style={{ background: "#EDF1EE", borderRadius: 4 }}>
              {ticket.ticketNumber}
            </div>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold small">Created Date</label>
            <div className="p-2" style={{ background: "#EDF1EE", borderRadius: 4 }}>
              {new Date(ticket.createdAt).toLocaleString()}
            </div>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold small">Category</label>
            <div className="p-2" style={{ background: "#EDF1EE", borderRadius: 4 }}>
              {ticket.category}
            </div>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold small">Related System</label>
            <div className="p-2" style={{ background: "#EDF1EE", borderRadius: 4 }}>
              {ticket.relatedSystem}
            </div>
          </div>

          <div className="col-md-4">
            <label className="form-label fw-semibold small">Requested Priority</label>
            <div>
              <span className="badge bg-warning-subtle text-dark">{ticket.requestedPriority}</span>
            </div>
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold small">Current Status</label>
            <div>
              <span className="badge bg-success-subtle text-success">{ticket.currentStatus}</span>
            </div>
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold small">Last Updated</label>
            <div className="p-2" style={{ background: "#EDF1EE", borderRadius: 4 }}>
              {new Date(ticket.updatedAt).toLocaleString()}
            </div>
          </div>

          <div className="col-12">
            <label className="form-label fw-semibold small">Summary</label>
            <div className="p-2" style={{ background: "#EDF1EE", borderRadius: 4 }}>
              {ticket.summary}
            </div>
          </div>

          <div className="col-12">
            <label className="form-label fw-semibold small">Description</label>
            <div className="p-2" style={{ background: "#EDF1EE", borderRadius: 4, whiteSpace: "pre-wrap" }}>
              {ticket.description}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="h5 mb-3">Attachments ({activeAttachments.length}/5 active)</h2>

        {uploadError && <div className="alert alert-danger">{uploadError}</div>}

        {activeAttachments.length < 5 && (
          <div className="mb-3">
            <input
              type="file"
              className="form-control"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={handleFileSelected}
              disabled={uploading}
            />
            {uploading && <div className="form-text">Uploading...</div>}
          </div>
        )}

        <ul className="list-group">
          {ticket.attachments.map((a) => (
            <li
              key={a.id}
              className={`list-group-item d-flex justify-content-between align-items-center ${
                a.isRemoved ? "list-group-item-secondary text-decoration-line-through" : ""
              }`}
            >
              <div>
                <div>{a.fileName}</div>
                <small className="text-muted">
                  {(a.fileSize / 1024).toFixed(0)} KB - uploaded{" "}
                  {new Date(a.uploadedAt).toLocaleDateString()}
                </small>
                {a.isRemoved && (
                  <div className="text-muted small">
                    Removed{a.removedReason ? `: ${a.removedReason}` : ""}
                  </div>
                )}
              </div>

              {!a.isRemoved && (
                <div className="d-flex gap-2 align-items-center">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    onClick={() => window.open(getAttachmentDownloadUrl(a.id, requester!.id), "_blank")}
                  >
                    Download
                  </button>

                  {removingId === a.id ? (
                    <div className="d-flex gap-1">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Reason"
                        value={removeReason}
                        onChange={(e) => setRemoveReason(e.target.value)}
                        style={{ width: 140 }}
                      />
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRemove(a.id)}
                      >
                        Confirm
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setRemovingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => setRemovingId(a.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

