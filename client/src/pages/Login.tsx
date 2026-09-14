import {useState} from 'react'
import {useAuth} from '../context/AuthContext'

export default function Login(){
  const {user,login,change,logout}=useAuth()
  const changing=Boolean(user?.mustChangePassword)
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[next,setNext]=useState(''),[confirm,setConfirm]=useState('')
  const [error,setError]=useState(''),[busy,setBusy]=useState(false)
  async function submit(event:React.FormEvent){
    event.preventDefault();setError('')
    if(changing && (next.length<12||next.length>128||next!==confirm||next===password)) {setError('Use a different password of 12–128 characters, with matching confirmation.');return}
    setBusy(true)
    try {if(changing)await change(password,next,confirm);else await login(email,password);setPassword('');setNext('');setConfirm('')}
    catch(error){setError(error instanceof Error?error.message:'Unable to sign in. Please retry.')}
    finally{setBusy(false)}
  }
  return <main className="auth-page"><section className="card auth-card p-4 p-sm-5" aria-labelledby="auth-title">
    <p className="text-success fw-bold">TokTickIT · IT support</p>
    <h1 id="auth-title" className="h3">{changing?'Change your initial password':'Welcome back'}</h1>
    <p className="text-muted">{changing?'Set your own password before accessing your tickets.':'Sign in to create and track your support requests.'}</p>
    <form onSubmit={submit}>
      {error&&<div role="alert" id="auth-error" className="alert alert-danger">{error}</div>}
      {!changing&&<div className="mb-3"><label htmlFor="email" className="form-label">Email</label><input id="email" type="email" className="form-control" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></div>}
      <div className="mb-3"><label htmlFor="password" className="form-label">{changing?'Current password':'Password'}</label><input id="password" type="password" className="form-control" autoComplete="current-password" required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></div>
      {changing&&<><div className="mb-3"><label htmlFor="new-password" className="form-label">New password</label><input id="new-password" type="password" className="form-control" autoComplete="new-password" required minLength={12} maxLength={128} value={next} onChange={e=>setNext(e.target.value)} aria-describedby="password-rules" disabled={busy}/><div id="password-rules" className="form-text">12–128 characters, different from your current password.</div></div><div className="mb-4"><label htmlFor="confirm-password" className="form-label">Confirm new password</label><input id="confirm-password" type="password" className="form-control" autoComplete="new-password" required value={confirm} maxLength={128} onChange={e=>setConfirm(e.target.value)} aria-invalid={Boolean(confirm&&confirm!==next)} disabled={busy}/></div></>}
      <button className="btn btn-success w-100" disabled={busy}>{busy?'Please wait…':changing?'Change password':'Sign in'}</button>
    </form>
    {changing&&<button className="btn btn-link mt-3" disabled={busy} onClick={async()=>{setBusy(true);try{await logout()}catch{setError('Unable to sign out. Please retry.')}finally{setBusy(false)}}}>Sign out</button>}
  </section></main>
}
