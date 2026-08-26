import 'bootstrap/dist/css/bootstrap.min.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RequesterProvider } from './context/RequesterContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RequesterProvider>
      <App />
    </RequesterProvider>
  </StrictMode>,
)