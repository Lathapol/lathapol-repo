import { useState } from 'react'
import { checkSystem } from './api'
import type { Category } from './api'
import './App.css'

type UiState = 'idle' | 'loading' | 'success' | 'error'

function App() {
  const [state, setState] = useState<UiState>('idle')
  const [categories, setCategories] = useState<Category[]>([])
  const [errorMessage, setErrorMessage] = useState('')

  async function handleCheck() {
    setState('loading')
    setErrorMessage('')

    try {
      const result = await checkSystem()
      setCategories(result.categories)
      setState('success')
    } catch (err) {
      setErrorMessage('Unable to connect to TokTickIT API')
      setState('error')
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button
        className="btn btn-success"
        onClick={handleCheck}
        disabled={state === 'loading'}
      >
        {state === 'loading' ? 'Loading…' : 'Check System'}
      </button>

      {state === 'success' && (
        <div className="mt-4">
          <p className="fw-bold text-success">System Status: Online</p>
          <p className="fw-semibold">Supported Request Categories:</p>
          <ul>
            {categories.map((cat) => (
              <li key={cat.id}>{cat.name}</li>
            ))}
          </ul>
        </div>
      )}

      {state === 'error' && (
        <div className="mt-4">
          <p className="fw-bold text-danger">System Status: Offline</p>
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  )
}

export default App