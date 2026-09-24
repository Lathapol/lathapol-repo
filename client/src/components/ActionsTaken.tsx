import { useEffect, useRef, useState } from 'react'
import { createAction, fetchActions, updateAction } from '../api'
import type { ActionTaken } from '../api'

type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR'
const blank = { description: '', result: '', followUpRequired: false, followUpNote: '', attachmentNotes: '' }
type Draft = typeof blank
type Errors = Partial<Record<keyof Draft, string>>
type Mode = null | { kind: 'create' } | { kind: 'edit'; id: number }

// Same limits as the server (BR-05, BR-06); the server stays the authority.
export function validateAction(draft: Draft): Errors {
  const errors: Errors = {}
  const description = draft.description.trim(), result = draft.result.trim(), note = draft.followUpNote.trim()
  if (!description || description.length > 2000) errors.description = 'Enter a description of 1 to 2000 characters.'
  if (!result || result.length > 2000) errors.result = 'Enter a result of 1 to 2000 characters.'
  if (draft.followUpRequired && (!note || note.length > 1000)) errors.followUpNote = 'Enter a follow-up note of 1 to 1000 characters when follow-up is required.'
  if (draft.attachmentNotes.trim().length > 500) errors.attachmentNotes = 'Attachment notes can be at most 500 characters.'
  return errors
}
const newKey = () => globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16))
const toDraft = (a: ActionTaken): Draft => ({ description: a.description, result: a.result, followUpRequired: a.followUpRequired, followUpNote: a.followUpNote ?? '', attachmentNotes: a.attachmentNotes ?? '' })

export default function ActionsTaken({ ticketId, role, ticketStatus }: { ticketId: number; role: Role; ticketStatus: string }) {
  const [actions, setActions] = useState<ActionTaken[]>([])
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false), [reload, setReload] = useState(0)
  const [mode, setMode] = useState<Mode>(null), [draft, setDraft] = useState<Draft>(blank), [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState(''), [success, setSuccess] = useState(''), [busy, setBusy] = useState(false)
  const requestKey = useRef(newKey())
  const canWrite = role !== 'REQUESTER'
  const closed = ['CLOSED', 'CANCELLED'].includes(ticketStatus)

  useEffect(() => {
    let current = true
    setLoading(true); setLoadError(false)
    fetchActions(ticketId).then(result => { if (current) setActions(result) }).catch(() => { if (current) setLoadError(true) }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [ticketId, reload])

  function open(next: Mode, initial: Draft) {
    setMode(next); setDraft(initial); setErrors({}); setFormError(''); setSuccess('')
    requestKey.current = newKey()
  }
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(old => ({ ...old, [key]: value }))

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setFormError(''); setSuccess('')
    const found = validateAction(draft)
    setErrors(found)
    if (Object.keys(found).length || !mode) return
    const input = { description: draft.description.trim(), result: draft.result.trim(), followUpRequired: draft.followUpRequired, followUpNote: draft.followUpRequired ? draft.followUpNote.trim() : null, attachmentNotes: draft.attachmentNotes.trim() || null }
    setBusy(true)
    try {
      if (mode.kind === 'create') {
        const created = await createAction(ticketId, requestKey.current, input)
        setActions(old => old.some(a => a.id === created.id) ? old : [...old, created])
        setSuccess('Action added.')
      } else {
        const version = actions.find(a => a.id === mode.id)?.version ?? 0
        const updated = await updateAction(mode.id, version, input)
        setActions(old => old.map(a => a.id === updated.id ? updated : a))
        setSuccess('Action updated.')
      }
      setMode(null); setDraft(blank)
    } catch (e) {
      const stale = (e as { status?: number }).status === 409
      setFormError(stale ? `${(e as Error).message} Reload the actions to see the latest version. Your text is kept.` : `${(e as Error).message || 'Unable to save the action.'} Your text is kept; you can retry.`)
    } finally { setBusy(false) }
  }

  const editing = mode?.kind === 'edit' ? actions.find(a => a.id === mode.id) : undefined
  const field = (key: keyof Draft) => ({ 'aria-invalid': errors[key] ? true : undefined, 'aria-describedby': errors[key] ? `action-${key}-error` : undefined })
  const fieldError = (key: keyof Draft) => errors[key] && <div id={`action-${key}-error`} className="invalid-feedback d-block">{errors[key]}</div>

  return <section className="card p-3 mb-4 actions-taken" aria-label="Actions Taken">
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <h2 className="h4 mb-0">Actions Taken</h2>
      {canWrite && !closed && !mode && !loading && !loadError && <button className="btn btn-success" onClick={() => open({ kind: 'create' }, blank)}>Add action</button>}
    </div>
    <p className="mt-2">{canWrite ? 'Work done on this ticket by IT Staff. Actions cannot be deleted.' : 'Work recorded by IT Staff on your ticket. This list is read-only.'}</p>
    {canWrite && closed && <p>This ticket is closed or cancelled, so actions can no longer be added or changed.</p>}
    {loading && <p role="status">Loading actions taken…</p>}
    {loadError && <div role="alert"><p>Unable to load actions taken. Please retry.</p><button className="btn btn-outline-secondary" onClick={() => setReload(reload + 1)}>Reload actions</button></div>}
    {success && <p role="status">{success}</p>}

    {mode && <form className="action-form" onSubmit={submit} noValidate aria-label={mode.kind === 'create' ? 'Add action' : 'Edit action'}>
      <h3 className="h5">{mode.kind === 'create' ? 'Add action' : 'Edit action'}</h3>
      {editing && <p className="readonly-field">Performed by {editing.performedBy.name} · Recorded {new Date(editing.createdAt).toLocaleString()} (these cannot be changed)</p>}
      <fieldset disabled={busy} className="action-fields">
        <label htmlFor="action-description">Action description</label>
        <textarea id="action-description" className="form-control" rows={3} maxLength={2000} value={draft.description} onChange={e => change('description', e.target.value)} {...field('description')} />
        {fieldError('description')}
        <label htmlFor="action-result">Result</label>
        <textarea id="action-result" className="form-control" rows={3} maxLength={2000} value={draft.result} onChange={e => change('result', e.target.value)} {...field('result')} />
        {fieldError('result')}
        <label className="action-check"><input type="checkbox" checked={draft.followUpRequired} onChange={e => change('followUpRequired', e.target.checked)} /> Follow-up required</label>
        <label htmlFor="action-followUpNote">Follow-up note{draft.followUpRequired ? ' (required)' : ''}</label>
        <textarea id="action-followUpNote" className="form-control" rows={2} maxLength={1000} disabled={!draft.followUpRequired} value={draft.followUpNote} onChange={e => change('followUpNote', e.target.value)} {...field('followUpNote')} />
        {fieldError('followUpNote')}
        <label htmlFor="action-attachmentNotes">Attachment notes (which file or image to look for)</label>
        <input id="action-attachmentNotes" className="form-control" maxLength={500} value={draft.attachmentNotes} onChange={e => change('attachmentNotes', e.target.value)} {...field('attachmentNotes')} />
        {fieldError('attachmentNotes')}
      </fieldset>
      {formError && <div role="alert"><p>{formError}</p>{formError.includes('Reload the actions') && <button type="button" className="btn btn-outline-secondary" onClick={() => setReload(reload + 1)}>Reload actions</button>}</div>}
      <div className="workflow-buttons">
        <button className="btn btn-success" disabled={busy}>{busy ? 'Saving…' : 'Save action'}</button>
        <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => { setMode(null); setErrors({}); setFormError('') }}>Cancel</button>
      </div>
    </form>}

    {!loading && !loadError && !actions.length && <p>No actions recorded yet.</p>}
    {!!actions.length && <table className="table actions-table">
      <thead><tr><th scope="col">Date/time</th><th scope="col">Performed by</th><th scope="col">Description</th><th scope="col">Result</th><th scope="col">Follow-up</th><th scope="col">Attachment notes</th>{canWrite && !closed && <th scope="col"><span className="visually-hidden">Actions</span></th>}</tr></thead>
      <tbody>{actions.map(a => <tr key={a.id}>
        <td data-label="Date/time"><time dateTime={a.createdAt}>{new Date(a.createdAt).toLocaleString()}</time></td>
        <td data-label="Performed by">{a.performedBy.name}</td>
        <td data-label="Description" className="entry-body">{a.description}</td>
        <td data-label="Result" className="entry-body">{a.result}</td>
        <td data-label="Follow-up" className="entry-body">{a.followUpRequired ? `Yes: ${a.followUpNote}` : 'No'}</td>
        <td data-label="Attachment notes" className="entry-body">{a.attachmentNotes || '—'}</td>
        {canWrite && !closed && <td><button className="btn btn-outline-success btn-sm" disabled={!!mode} aria-label={`Edit action by ${a.performedBy.name} on ${new Date(a.createdAt).toLocaleString()}`} onClick={() => open({ kind: 'edit', id: a.id }, toDraft(a))}>Edit</button></td>}
      </tr>)}</tbody>
    </table>}
  </section>
}
