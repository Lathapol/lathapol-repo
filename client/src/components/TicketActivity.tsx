import { useEffect, useState } from 'react'
import { appearsResolved, fetchEntries, fetchOwners, postEntry, updateWorkflow } from '../api'
import type { TicketDetail, TicketEntry, QueueOwner } from '../api'
import ActionsTaken from './ActionsTaken'

const transitions: Record<string,string[]> = {
  NEW:['OPEN','CANCELLED'], OPEN:['IN_PROGRESS','WAITING_FOR_REQUESTER','RESOLVED','CANCELLED'],
  IN_PROGRESS:['WAITING_FOR_REQUESTER','RESOLVED','CANCELLED'], WAITING_FOR_REQUESTER:['IN_PROGRESS','RESOLVED','CANCELLED'],
  RESOLVED:['CLOSED','REOPENED'], REOPENED:['OPEN','IN_PROGRESS','CANCELLED'], CLOSED:[], CANCELLED:[],
}
type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR'
const readable = (s:string) => s.replaceAll('_',' ')

function Conversation({ticketId,kind,canWrite}:{ticketId:number;kind:'comments'|'notes';canWrite:boolean}) {
  const [entries,setEntries]=useState<TicketEntry[]>([])
  const [body,setBody]=useState(''),[error,setError]=useState(''),[success,setSuccess]=useState('')
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0)
  const title=kind==='comments'?'Public Comments':'Internal Notes'
  useEffect(()=>{
    let current=true;setLoading(true);setError('')
    fetchEntries(ticketId,kind).then(result=>{if(current)setEntries(result)}).catch(()=>{if(current)setError(`Unable to load ${title.toLowerCase()}. Please retry.`)}).finally(()=>{if(current)setLoading(false)})
    return ()=>{current=false}
  },[ticketId,kind,retry,title])
  async function submit(event:React.FormEvent) {
    event.preventDefault();setError('');setSuccess('')
    if(!body.trim()||body.trim().length>4000){setError('Enter between 1 and 4000 characters.');return}
    setBusy(true)
    try {const entry=await postEntry(ticketId,kind,body);setEntries(old=>[...old,entry]);setBody('');setSuccess(kind==='comments'?'Comment posted.':'Internal note posted.')}
    catch {setError('Unable to confirm posting. Your text is kept. Reload entries before retrying to avoid duplicates.')}
    finally {setBusy(false)}
  }
  return <section className={`card p-3 mb-4 conversation ${kind==='notes'?'internal-notes':''}`} aria-label={title}>
    <h2 className="h4">{title}</h2><p>{kind==='comments'?'Visible to the requester and support team.':'Private: visible only to IT Staff and Administrators.'}</p>
    {loading&&<p role="status">Loading {title.toLowerCase()}…</p>}
    {error&&<div role="alert"><p>{error}</p><button className="btn btn-outline-secondary" disabled={busy} onClick={()=>setRetry(retry+1)}>Reload {title.toLowerCase()}</button></div>}
    {success&&<p role="status">{success}</p>}
    {!loading&&!error&&!entries.length&&<p>No {title.toLowerCase()} yet.</p>}
    <ol className="entry-list">{entries.map(e=><li key={e.id}><strong>{e.author.name}</strong> <time dateTime={e.createdAt}>{new Date(e.createdAt).toLocaleString()}</time><p className="entry-body">{e.body}</p></li>)}</ol>
    {canWrite&&<form onSubmit={submit}><label className="form-label" htmlFor={`entry-${kind}`}>{kind==='comments'?'New public comment':'New internal note'}</label><textarea id={`entry-${kind}`} className="form-control" rows={3} maxLength={4000} value={body} disabled={busy} onChange={e=>setBody(e.target.value)}/><p className="small">{body.length}/4000 characters · Entries cannot be edited or deleted.</p><button className="btn btn-success" disabled={busy||loading}>{busy?'Posting…':kind==='comments'?'Post comment':'Post internal note'}</button></form>}
  </section>
}

export default function TicketActivity({ticket,role,onRefresh}:{ticket:TicketDetail;role:Role;onRefresh:()=>void}) {
  const [owners,setOwners]=useState<QueueOwner[]>([]),[ownersError,setOwnersError]=useState(false),[ownerRetry,setOwnerRetry]=useState(0)
  const [owner,setOwner]=useState(String(ticket.ownerId??'')),[priority,setPriority]=useState(ticket.itPriority||'MEDIUM'),[status,setStatus]=useState('')
  const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{
    if(role!=='IT_STAFF')return
    let current=true;setOwnersError(false)
    fetchOwners().then(result=>{if(current)setOwners(result)}).catch(()=>{if(current)setOwnersError(true)})
    return()=>{current=false}
  },[role,ownerRetry])
  const needsConfirm=['RESOLVED','CLOSED','CANCELLED'].includes(status)
  async function action(claim=false,signal=false) {
    setError('');setBusy(true)
    try {
      if(signal)await appearsResolved(ticket.id)
      else if(claim)await updateWorkflow(ticket.id,{version:ticket.version!},true)
      else await updateWorkflow(ticket.id,{version:ticket.version!,...(owner!==String(ticket.ownerId??'')?{ownerId:owner?Number(owner):null}:{}),...(priority!==ticket.itPriority?{itPriority:priority}:{}),...(status?{currentStatus:status,confirmed}: {})})
      onRefresh()
    } catch(e) {setError(e instanceof Error?e.message:'Unable to save. Please retry.')}
    finally {setBusy(false)}
  }
  return <div className="ticket-activity">
    <section className="card p-3 mb-4" aria-label="Ticket workflow"><h2 className="h4">Ticket workflow</h2>
      <p>Requester: {ticket.requester?.name}<br/>Owner: {ticket.owner?.name||'Unassigned'}<br/>IT priority: {ticket.itPriority}<br/>Status: {readable(ticket.currentStatus)}</p>
      {ticket.requesterResolvedAt&&<p role="status">Requester reported apparent resolution on {new Date(ticket.requesterResolvedAt).toLocaleString()}. Formal status: {readable(ticket.currentStatus)}.</p>}
      {error&&<div role="alert"><p>{error}</p><button className="btn btn-outline-secondary" disabled={busy} onClick={onRefresh}>Reload ticket</button></div>}
      {role==='IT_STAFF'&&<>
        {ownersError&&<p role="alert">Unable to load eligible owners. <button className="btn btn-outline-secondary" onClick={()=>setOwnerRetry(ownerRetry+1)}>Retry owners</button></p>}
        <form onSubmit={e=>{e.preventDefault();void action()}}>
          <fieldset disabled={busy} className="workflow-fields">
            <label>Owner<select className="form-select" value={owner} onChange={e=>setOwner(e.target.value)}><option value="">Unassigned</option>{ticket.owner&&!owners.some(o=>o.id===ticket.ownerId)&&<option value={ticket.owner.id}>{ticket.owner.name} (current owner)</option>}{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
            <label>IT priority<select className="form-select" value={priority} onChange={e=>setPriority(e.target.value)}>{['LOW','MEDIUM','HIGH'].map(p=><option key={p}>{p}</option>)}</select></label>
            <label>Change status<select className="form-select" value={status} onChange={e=>{setStatus(e.target.value);setConfirmed(false)}}><option value="">Keep {readable(ticket.currentStatus)}</option>{transitions[ticket.currentStatus].map(s=><option key={s} value={s}>{readable(s)}</option>)}</select></label>
            {needsConfirm&&<label className="workflow-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Confirm changing status to {readable(status)}</label>}
            <div className="workflow-buttons"><button className="btn btn-success" disabled={ownersError||(needsConfirm&&!confirmed)||(!status&&owner===String(ticket.ownerId??'')&&priority===ticket.itPriority)}>{busy?'Saving…':'Save changes'}</button>{ticket.ownerId===null&&<button type="button" className="btn btn-outline-success" onClick={()=>void action(true)}>Claim ticket</button>}</div>
          </fieldset>
        </form>
      </>}
      {role==='REQUESTER'&&!ticket.requesterResolvedAt&&!['CLOSED','CANCELLED'].includes(ticket.currentStatus)&&<><p>Tell support if the problem appears fixed. This does not resolve or close your ticket.</p><button className="btn btn-outline-success" disabled={busy} onClick={()=>void action(false,true)}>{busy?'Saving…':'This appears resolved'}</button></>}
    </section>
    <ActionsTaken ticketId={ticket.id} role={role} ticketStatus={ticket.currentStatus}/>
    <Conversation ticketId={ticket.id} kind="comments" canWrite={role!=='ADMINISTRATOR'}/>
    {role!=='REQUESTER'&&<Conversation ticketId={ticket.id} kind="notes" canWrite={role==='IT_STAFF'}/>}
  </div>
}
