import { describe, it, expect, vi, afterEach } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../../src/App'

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the TokTickIT heading', () => {
    render(<App />)
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument()
  })

  it('shows an Offline error message when the API is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /check system/i }))

    await waitFor(() => {
      expect(screen.getByText(/system status: offline/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/unable to connect to toktickit api/i)).toBeInTheDocument()
  })
})