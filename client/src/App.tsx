import TicketQueue from './pages/TicketQueue'
﻿import { useState } from "react"
import { RequesterProvider, useRequester } from "./context/RequesterContext"
import Login from "./pages/Login"
import { useAuth } from "./context/AuthContext"
import CreateTicket from "./pages/CreateTicket"
import MyTickets from "./pages/MyTickets"
import TicketDetail from "./pages/TicketDetail"
import "./App.css"

type Page = { type: "myTickets" } | { type: "createTicket" } | { type: "ticketDetail"; id: number }

function RequesterApp() {
  const {logout}=useAuth()
  const [logoutError,setLogoutError]=useState(""),[loggingOut,setLoggingOut]=useState(false)
  const { requester } = useRequester()
  const [page, setPage] = useState<Page>({ type: "myTickets" })

  if (!requester) {
    return null
  }

  return (
    <div>
      <nav className="navbar navbar-expand" style={{ backgroundColor: "#006B3C" }}>
        <div className="container">
          <span className="navbar-brand text-white fw-bold">TokTickIT</span>
          <div className="d-flex gap-3">
            <button
              className={`btn btn-sm ${page.type === "myTickets" ? "btn-light" : "btn-outline-light"}`}
              onClick={() => setPage({ type: "myTickets" })}
            >
              My Tickets
            </button>
            <button
              className={`btn btn-sm ${page.type === "createTicket" ? "btn-light" : "btn-outline-light"}`}
              onClick={() => setPage({ type: "createTicket" })}
            >
              Create Ticket
            </button>
          </div>
          <div className="ms-auto text-white d-flex align-items-center gap-3">
            <span>
              Requester: <strong>{requester.name}</strong>
            </span>
            <button
              className="btn btn-sm btn-outline-light"
              disabled={loggingOut}
              onClick={async () => {setLoggingOut(true);try{await logout()}catch{setLogoutError("Unable to sign out. Please retry.")}finally{setLoggingOut(false)}}}
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {logoutError && <div role="alert" className="alert alert-danger">{logoutError}</div>}
      {page.type === "myTickets" && (
        <MyTickets
          onCreateTicket={() => setPage({ type: "createTicket" })}
          onOpenTicket={(id) => setPage({ type: "ticketDetail", id })}
        />
      )}
      {page.type === "createTicket" && <CreateTicket onOpenTicket={id=>setPage({type:'ticketDetail',id})}/>}
      {page.type === "ticketDetail" && (
        <TicketDetail ticketId={page.id} onBack={() => setPage({ type: "myTickets" })} />
      )}
    </div>
  )
}

function RoleHome(){
  const {user,logout}=useAuth()
  const [error,setError]=useState('')
  const [ticketId,setTicketId]=useState<number|null>(null)
  const [busy,setBusy]=useState(false)
  if(!user)return null
  return <RequesterProvider key={user.id} initialRequester={user}>
    <nav className="navbar queue-nav"><div className="container"><strong>TokTickIT</strong><span>{user.name} · {user.role==='IT_STAFF'?'IT Staff':'Administrator'}</span><button className="btn btn-outline-light" disabled={busy} onClick={async()=>{setBusy(true);try{await logout()}catch{setError('Unable to sign out. Please retry.')}finally{setBusy(false)}}}>Sign out</button></div></nav>
    {error&&<p role="alert">{error}</p>}
    {ticketId===null?<TicketQueue onOpenTicket={setTicketId}/>:<TicketDetail ticketId={ticketId} readOnly onBack={()=>setTicketId(null)}/>}
  </RequesterProvider>
}
function App(){
  const {user,loading,error,refresh}=useAuth()
  if(loading)return <main className="container py-5" role="status">Checking your session…</main>
  if(error)return <main className="container py-5"><p role="alert">{error}</p><button className="btn btn-success" onClick={()=>void refresh()}>Retry</button></main>
  if(!user||user.mustChangePassword)return <Login key={user?.id??'login'}/>
  if(user.role!=='REQUESTER')return <RoleHome/>
  return <RequesterProvider key={user.id} initialRequester={user}><RequesterApp/></RequesterProvider>
}
export default App
