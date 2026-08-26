import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RequesterSelection from '../../src/pages/RequesterSelection'
import { RequesterProvider } from '../../src/context/RequesterContext'

describe('RequesterSelection', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows an empty state when no active requesters exist', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response)

    render(
      <RequesterProvider>
        <RequesterSelection onContinue={() => {}} />
      </RequesterProvider>
    )

    await waitFor(() => {
      expect(
        screen.getByText(/no active development requesters/i)
      ).toBeInTheDocument()
    })
  })

  it('shows an error state when the API call fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))

    render(
      <RequesterProvider>
        <RequesterSelection onContinue={() => {}} />
      </RequesterProvider>
    )

    await waitFor(() => {
      expect(
        screen.getByText(/unable to load development requesters/i)
      ).toBeInTheDocument()
    })
  })

  it('populates the dropdown and enables Continue after selection', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, name: 'Jennifer Anderson', email: 'j@example.com' }],
    } as Response)

    render(
      <RequesterProvider>
        <RequesterSelection onContinue={() => {}} />
      </RequesterProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Jennifer Anderson')).toBeInTheDocument()
    })

    const continueBtn = screen.getByRole('button', { name: /continue/i })
    expect(continueBtn).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/development requester/i), {
      target: { value: '1' },
    })

    expect(continueBtn).not.toBeDisabled()
  })
})