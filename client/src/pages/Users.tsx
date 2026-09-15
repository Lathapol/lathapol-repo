import {useEffect,useState} from 'react'
import {fetchUsers,saveUser,resetUserPassword} from '../api'
import type {ManagedUser,UserFields} from '../api'

const roles = ['REQUESTER','IT_STAFF','ADMINISTRATOR'] as const
const roleName = (role:string) => role.replaceAll('_',' ')
function UserEditor({user,currentUserId,onSaved,onCancel,onSelfChange}:{user:ManagedUser|null;currentUserId:number;onSaved:(message:string)=>void;onCancel:()=>void;onSelfChange:()=>Promise<void>}) {
  const [draft,setDraft]=useState<UserFields>(user?{name:user.name,email:user.email,role:user.role,isActive:user.isActive}:{name:'',email:'',role:'REQUESTER',isActive:true})
  const [password,setPassword]=useState(''),[resetPassword,setResetPassword]=useState('')
  const [confirmed,setConfirmed]=useState(false),[resetConfirmed,setResetConfirmed]=useState(false)
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('')
  const deactivating=!!user?.isActive&&!draft.isActive
  async function submit(e:React.FormEvent){
    e.preventDefault();setError('');setSuccess('')
    if(!draft.name.trim()||draft.name.trim().length>100||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())||draft.email.trim().length>254||(!user&&(password.length<12||password.length>128))){setError('Check the name, email and password rules below.');return}
    if(deactivating&&!confirmed){setError('Confirm deactivation before saving.');return}
    setBusy(true)
    try {await saveUser({...draft,...(!user?{initialPassword:password}:{})},user?.id);setPassword('');if(user?.id===currentUserId)await onSelfChange();onSaved(user?'Account updated.':'Account created. Share the initial password privately.')}catch(e){setError(e instanceof Error?e.message:'Unable to save this account. Please retry.')}finally{setBusy(false)}
  }
  async function reset(e:React.FormEvent){
    e.preventDefault();setError('');setSuccess('')
    if(!resetConfirmed||resetPassword.length<12||resetPassword.length>128){setError('Use 12–128 characters and confirm the password reset.');return}
    setBusy(true)
    try{await resetUserPassword(user!.id,resetPassword);setResetPassword('');setResetConfirmed(false);setSuccess('Initial password set. Existing sessions ended; password change is required at next login.');if(user!.id===currentUserId)await onSelfChange()}catch(e){setError(e instanceof Error?e.message:'Unable to reset the password. Please retry.')}finally{setBusy(false)}
  }
  return <section className="card p-4 user-editor"><h2>{user?'Edit account':'Create account'}</h2>
    {error&&<p role="alert" className="alert alert-danger">{error}</p>}{success&&<p role="status" className="alert alert-success">{success}</p>}
    <form onSubmit={submit}><fieldset disabled={busy} className="user-form">
      <label>Name<input className="form-control" required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/><small>1–100 characters.</small></label>
      <label>Email<input type="email" className="form-control" required maxLength={254} value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/><small>Use a unique email address.</small></label>
      <label>Role<select className="form-select" value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value as UserFields['role']})}>{roles.map(role=><option key={role} value={role}>{roleName(role)}</option>)}</select></label>
      <label className="user-check"><input type="checkbox" checked={draft.isActive} disabled={user?.id===currentUserId} onChange={e=>{setDraft({...draft,isActive:e.target.checked});setConfirmed(false)}}/> Active account</label>
      {user?.id===currentUserId&&<p>You cannot deactivate your own account.</p>}
      {!user&&<label>Initial password<input type="password" className="form-control" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/><small>12–128 characters. The user must change it at first login.</small></label>}
      {deactivating&&<label className="user-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Confirm deactivation and end this user's sessions</label>}
      <div className="user-actions"><button className="btn btn-success" disabled={deactivating&&!confirmed}>{busy?'Saving…':user?'Save account':'Create account'}</button><button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button></div>
    </fieldset></form>
    {user&&<form onSubmit={reset} className="mt-4 border-top pt-4"><h3 className="h5">Set initial password</h3><p>This signs the user out and requires a password change at next login.</p><fieldset disabled={busy} className="user-form"><label>New initial password<input className="form-control" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={resetPassword} onChange={e=>setResetPassword(e.target.value)}/><small>12–128 characters; different from the current password.</small></label><label className="user-check"><input type="checkbox" checked={resetConfirmed} onChange={e=>setResetConfirmed(e.target.checked)}/> Confirm password reset and sign out existing sessions</label><button className="btn btn-outline-success" disabled={!resetConfirmed}>{busy?'Saving…':'Set initial password'}</button></fieldset></form>}
  </section>
}

export default function Users({currentUserId,onSelfChange}:{currentUserId:number;onSelfChange:()=>Promise<void>}) {
  const [search,setSearch]=useState(''),[role,setRole]=useState(''),[query,setQuery]=useState({search:'',role:''})
  const [users,setUsers]=useState<ManagedUser[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[success,setSuccess]=useState(''),[retry,setRetry]=useState(0)
  const [editor,setEditor]=useState<{user:ManagedUser|null}|null>(null)
  useEffect(()=>{
    let current=true;setLoading(true);setError('')
    fetchUsers(query.search,query.role).then(result=>{if(current)setUsers(result)}).catch((e:{status?:number})=>{if(current)setError(e.status===403?'You do not have access to user management.':'Unable to load accounts. Please retry.')}).finally(()=>{if(current)setLoading(false)})
    return()=>{current=false}
  },[query,retry])
  const edit=(user:ManagedUser)=>{setSuccess('');setEditor({user})}
  return <main className="container users-page py-4"><h1>User Management</h1><p>Create accounts and manage access to TokTickIT.</p>
    {editor?<UserEditor user={editor.user} currentUserId={currentUserId} onSelfChange={onSelfChange} onCancel={()=>setEditor(null)} onSaved={message=>{setSuccess(message);setEditor(null);setRetry(retry+1)}}/>:<>
      {success&&<p role="status" className="alert alert-success">{success}</p>}
      <form className="card p-3 user-filters" onSubmit={e=>{e.preventDefault();setQuery({search,role})}}><label>Search name or email<input className="form-control" value={search} maxLength={200} onChange={e=>setSearch(e.target.value)}/></label><label>Filter role<select className="form-select" value={role} onChange={e=>setRole(e.target.value)}><option value="">All roles</option>{roles.map(r=><option key={r} value={r}>{roleName(r)}</option>)}</select></label><div className="user-actions"><button className="btn btn-success">Search</button><button type="button" className="btn btn-outline-secondary" onClick={()=>{setSearch('');setRole('');setQuery({search:'',role:''})}}>Reset filters</button></div></form>
      <button className="btn btn-success my-3" onClick={()=>{setSuccess('');setEditor({user:null})}}>Create account</button>
      {loading?<p role="status">Loading accounts…</p>:error?<div className="alert alert-danger"><p role="alert">{error}</p><button className="btn btn-outline-secondary" onClick={()=>setRetry(retry+1)}>Retry</button></div>:<>
        <p role="status">{users.length} accounts</p>
        {!users.length?<p>{query.search||query.role?'No accounts match these filters.':'No accounts yet.'}</p>:<>
          <table className="table users-table"><caption className="visually-hidden">User accounts</caption><thead><tr>{['Name','Email','Role','Status','Action'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{roleName(u.role)}</td><td>{u.isActive?'Active':'Inactive'}{u.mustChangePassword&&<small className="d-block">Password change required</small>}</td><td><button className="btn btn-outline-success" aria-label={`Edit ${u.email}`} onClick={()=>edit(u)}>Edit</button></td></tr>)}</tbody></table>
          <div className="user-cards">{users.map(u=><article key={u.id} className="card p-3"><h2 className="h5">{u.name}</h2><p>{u.email}<br/>{roleName(u.role)} · {u.isActive?'Active':'Inactive'}{u.mustChangePassword&&<><br/>Password change required</>}</p><button className="btn btn-outline-success" aria-label={`Edit ${u.email}`} onClick={()=>edit(u)}>Edit</button></article>)}</div>
        </>}
      </>}
    </>}
  </main>
}
