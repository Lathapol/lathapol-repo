import { useState } from "react"
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
  return <main className="container py-5"><h1>TokTickIT</h1><p>{user?.name} · {user?.role==='IT_STAFF'?'IT Staff':'Administrator'}</p><h2>{user?.role==='IT_STAFF'?'Ticket Queue':'User Management'}</h2><p>This workspace will be added in the next Lab 3 issues.</p>{error&&<p role="alert">{error}</p>}<button className="btn btn-success" onClick={()=>logout().catch(()=>setError('Unable to sign out. Please retry.'))}>Sign out</button></main>
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
