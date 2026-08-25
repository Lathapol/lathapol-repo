import { useEffect, useState } from 'react'
import { fetchRequesters } from '../api'
import type { Requester } from '../api'
import { useRequester } from '../context/RequesterContext'

type LoadState = 'loading' | 'success' | 'empty' | 'error'

export default function RequesterSelection({ onContinue }: { onContinue: () => void }) {
  const [state, setState] = useState<LoadState>('loading')
  const [requesters, setRequesters] = useState<Requester[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const { setRequester } = useRequester()

  useEffect(() => {
    fetchRequesters()
      .then((data) => {
        setRequesters(data)
        setState(data.length === 0 ? 'empty' : 'success')
      })
      .catch(() => setState('error'))
  }, [])

  function handleContinue() {
    const selected = requesters.find((r) => r.id === selectedId)
    if (selected) {
      setRequester(selected)
      onContinue()
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <div className="card p-4 shadow-sm">
        <h1 className="h4 text-center mb-2">Select Development Requester</h1>
        <p className="text-muted text-center small mb-4">
          Choose a development requester to simulate the current requester context for
          Lab 2. This is for testing only and is not a login screen.
        </p>

        {state === 'loading' && <p className="text-center">Loading...</p>}

        {state === 'error' && (
          <p className="text-danger text-center">
            Unable to load Development Requesters. Please try again later.
          </p>
        )}

        {state === 'empty' && (
          <p className="text-danger text-center">
            No active Development Requesters are available.
          </p>
        )}

        {state === 'success' && (
          <>
            <label htmlFor="requester-select" className="form-label fw-semibold">
              Development Requester <span className="text-danger">*</span>
            </label>
            <select
              id="requester-select"
              className="form-select mb-3"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              <option value="" disabled>
                Select a requester...
              </option>
              {requesters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <div className="alert alert-success small py-2">
              Only active development requesters are shown.
            </div>

            <div className="alert alert-secondary small py-2">
              <strong>Authentication coming in Lab 3</strong>
              <br />
              In Lab 3, this selection will be replaced with secure authentication.
            </div>

            <button
              className="btn btn-success w-100 mt-2"
              disabled={selectedId === null}
              onClick={handleContinue}
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  )
}