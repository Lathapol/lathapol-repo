import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CreateTicket from '../../src/pages/CreateTicket'
import { RequesterProvider } from '../../src/context/RequesterContext'

function renderWithProvider() {
  return render(
    <RequesterProvider initialRequester={{ id: 1, name: 'Jennifer Anderson', email: 'j@example.com' }}>
      <CreateTicket />
    </RequesterProvider>
  )
}

describe('CreateTicket', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows field validation errors when submitting empty required fields', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlStr = url.toString()
      if (urlStr.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, name: 'Hardware' }],
        } as Response)
      }
      if (urlStr.includes('/api/related-systems')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, name: 'VPN' }],
        } as Response)
      }
      return Promise.reject(new Error('Unexpected fetch'))
    })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByText('Create Ticket')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }))

    await waitFor(() => {
      expect(screen.getByText(/please select a category/i)).toBeInTheDocument()
      expect(screen.getByText(/please select a related system/i)).toBeInTheDocument()
    })
  })

  it('submits successfully and shows the returned ticket number', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url, options) => {
      const urlStr = url.toString()
      if (urlStr.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, name: 'Hardware' }],
        } as Response)
      }
      if (urlStr.includes('/api/related-systems')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, name: 'VPN' }],
        } as Response)
      }
      if (urlStr.includes('/api/tickets') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ticketNumber: 'TKT-2026-000099' }),
        } as Response)
      }
      return Promise.reject(new Error('Unexpected fetch'))
    })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByText('Create Ticket')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/^category/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/^summary/i), {
      target: { value: 'Valid summary text' },
    })
    fireEvent.change(screen.getByLabelText(/^description/i), {
      target: { value: 'This is a valid ticket description.' },
    })

    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }))

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000099')).toBeInTheDocument()
    })
  })

  it('shows a safe error message and preserves field values on API failure', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url, options) => {
      const urlStr = url.toString()
      if (urlStr.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, name: 'Hardware' }],
        } as Response)
      }
      if (urlStr.includes('/api/related-systems')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, name: 'VPN' }],
        } as Response)
      }
      if (urlStr.includes('/api/tickets') && options?.method === 'POST') {
        return Promise.reject(new Error('Network error'))
      }
      return Promise.reject(new Error('Unexpected fetch'))
    })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByText('Create Ticket')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/^category/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/^summary/i), {
      target: { value: 'Valid summary text' },
    })
    fireEvent.change(screen.getByLabelText(/^description/i), {
      target: { value: 'This is a valid ticket description.' },
    })

    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }))

    await waitFor(() => {
  expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('Valid summary text')).toBeInTheDocument()
  })
})
