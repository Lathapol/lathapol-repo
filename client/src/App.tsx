import { useState } from "react"
import { useRequester } from "./context/RequesterContext"
import RequesterSelection from "./pages/RequesterSelection"
import CreateTicket from "./pages/CreateTicket"
import MyTickets from "./pages/MyTickets"
import TicketDetail from "./pages/TicketDetail"
import "./App.css"

type Page = { type: "myTickets" } | { type: "createTicket" } | { type: "ticketDetail"; id: number }

function App() {
  const { requester, setRequester } = useRequester()
  const [page, setPage] = useState<Page>({ type: "myTickets" })

  if (!requester) {
    return <RequesterSelection onContinue={() => {}} />
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
              Logged in as: <strong>{requester.name}</strong>
            </span>
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => setRequester(null)}
            >
              Change Requester
            </button>
          </div>
        </div>
      </nav>

      {page.type === "myTickets" && (
        <MyTickets
          onCreateTicket={() => setPage({ type: "createTicket" })}
          onOpenTicket={(id) => setPage({ type: "ticketDetail", id })}
        />
      )}
      {page.type === "createTicket" && <CreateTicket />}
      {page.type === "ticketDetail" && (
        <TicketDetail ticketId={page.id} onBack={() => setPage({ type: "myTickets" })} />
      )}
    </div>
  )
}

export default App
