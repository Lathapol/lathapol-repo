import { useEffect, useState } from 'react'
import { useRequester } from '../context/RequesterContext'
import {
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
} from '../api'
import type { Category, RelatedSystem } from '../api'
import AttachmentPicker from '../components/AttachmentPicker'
import type { PickedFile } from '../components/AttachmentPicker'

type LoadState = 'loading' | 'success' | 'error'
type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

interface FieldErrors {
  summary?: string
  description?: string
  categoryId?: string
  relatedSystemId?: string
}

export default function CreateTicket() {
  const { requester } = useRequester()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [categories, setCategories] = useState<Category[]>([])
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([])

  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [relatedSystemId, setRelatedSystemId] = useState<number | ''>('')
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [requestedPriority, setRequestedPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [attachments, setAttachments] = useState<PickedFile[]>([])

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [submitError, setSubmitError] = useState('')
  const [ticketNumber, setTicketNumber] = useState('')

  useEffect(() => {
    Promise.all([fetchCategories(), fetchRelatedSystems()])
      .then(([cats, systems]) => {
        setCategories(cats)
        setRelatedSystems(systems)
        setLoadState('success')
      })
      .catch(() => setLoadState('error'))
  }, [])

  function validate(): boolean {
    const errors: FieldErrors = {}
    const trimmedSummary = summary.trim()
    const trimmedDescription = description.trim()

    if (trimmedSummary.length < 5 || trimmedSummary.length > 150) {
      errors.summary = 'Summary must be between 5 and 150 characters.'
    }
    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      errors.description = 'Description must be between 10 and 2000 characters.'
    }
    if (!categoryId) {
      errors.categoryId = 'Please select a category.'
    }
    if (!relatedSystemId) {
      errors.relatedSystemId = 'Please select a related system.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!requester) return
    if (!validate()) return

    if (attachments.some((f) => f.error)) {
      setSubmitError('Please remove invalid attachments before submitting.')
      setSubmitState('error')
      return
    }

    setSubmitState('submitting')
    setSubmitError('')

    try {
      const ticket = await createTicket({
        requesterId: requester.id,
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        summary: summary.trim(),
        description: description.trim(),
        requestedPriority,
      })
      setTicketNumber(ticket.ticketNumber)
      setSubmitState('success')
    } catch (err: any) {
      setSubmitError(err.message ?? 'Unable to create ticket. Please try again.')
      setSubmitState('error')
    }
  }

  if (loadState === 'loading') {
    return <p className="text-center py-5">Loading...</p>
  }

  if (loadState === 'error') {
    return (
      <div className="alert alert-danger m-4">
        Unable to load ticket form data. Please try again later.
      </div>
    )
  }

  if (submitState === 'success') {
    return (
      <div className="container py-5" style={{ maxWidth: 480 }}>
        <div className="alert alert-success text-center p-4">
          <h4>Ticket Created</h4>
          <p className="mb-1">Your official Ticket Number is:</p>
          <p className="fw-bold fs-5">{ticketNumber}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <h1 className="h4 mb-4">Create Ticket</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="requester" className="form-label fw-semibold">
            Requester
          </label>
          <input
            id="requester"
            type="text"
            className="form-control"
            value={requester?.name ?? ''}
            readOnly
            style={{ background: '#EDF1EE' }}
          />
        </div>

        <div className="row">
          <div className="col-md-4 mb-3">
            <label htmlFor="category" className="form-label fw-semibold">
              Category <span className="text-danger">*</span>
            </label>
            <select
              id="category"
              className={`form-select ${fieldErrors.categoryId ? 'is-invalid' : ''}`}
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
            >
              <option value="">Select...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && (
              <div className="invalid-feedback">{fieldErrors.categoryId}</div>
            )}
          </div>

          <div className="col-md-4 mb-3">
            <label htmlFor="relatedSystem" className="form-label fw-semibold">
              Related System <span className="text-danger">*</span>
            </label>
            <select
              id="relatedSystem"
              className={`form-select ${fieldErrors.relatedSystemId ? 'is-invalid' : ''}`}
              value={relatedSystemId}
              onChange={(e) => setRelatedSystemId(Number(e.target.value))}
            >
              <option value="">Select...</option>
              {relatedSystems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {fieldErrors.relatedSystemId && (
              <div className="invalid-feedback">{fieldErrors.relatedSystemId}</div>
            )}
          </div>

          <div className="col-md-4 mb-3">
            <label htmlFor="priority" className="form-label fw-semibold">
              Requested Priority
            </label>
            <select
              id="priority"
              className="form-select"
              value={requestedPriority}
              onChange={(e) => setRequestedPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="summary" className="form-label fw-semibold">
            Summary <span className="text-danger">*</span>
          </label>
          <input
            id="summary"
            type="text"
            className={`form-control ${fieldErrors.summary ? 'is-invalid' : ''}`}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          {fieldErrors.summary && <div className="invalid-feedback">{fieldErrors.summary}</div>}
        </div>

        <div className="mb-3">
          <label htmlFor="description" className="form-label fw-semibold">
            Description <span className="text-danger">*</span>
          </label>
          <textarea
            id="description"
            className={`form-control ${fieldErrors.description ? 'is-invalid' : ''}`}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {fieldErrors.description && (
            <div className="invalid-feedback">{fieldErrors.description}</div>
          )}
        </div>

        <AttachmentPicker files={attachments} onChange={setAttachments} />

        {submitState === 'error' && (
          <div className="alert alert-danger">{submitError}</div>
        )}

        <button type="submit" className="btn btn-success" disabled={submitState === 'submitting'}>
          {submitState === 'submitting' ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  )
}
