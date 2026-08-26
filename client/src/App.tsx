import { useRequester } from './context/RequesterContext'
import RequesterSelection from './pages/RequesterSelection'
import './App.css'

function App() {
  const { requester, setRequester } = useRequester()

  if (!requester) {
    return <RequesterSelection onContinue={() => {}} />
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 mb-0">
          TokTickIT <span className="text-success">IT Service Desk</span>
        </h1>
        <div>
          <span className="me-3">
            Logged in as: <strong>{requester.name}</strong>
          </span>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setRequester(null)}
          >
            Change Requester
          </button>
        </div>
      </div>

      <p className="text-muted">
        My Tickets and Create Ticket screens will go here (Issues 4-6).
      </p>
    </div>
  )
}

export default App