import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import MyTickets from "../../src/pages/MyTickets"
import { RequesterProvider } from "../../src/context/RequesterContext"

function renderWithProvider(requesterId = 1) {
  return render(
    <RequesterProvider
      initialRequester={{ id: requesterId, name: "Jennifer Anderson", email: "j@example.com" }}
    >
      <MyTickets onCreateTicket={() => {}} />
    </RequesterProvider>
  )
}

describe("MyTickets", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("shows an empty state when the requester has zero tickets", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        meta: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 },
      }),
    } as Response)

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByText(/don't have any tickets yet/i)).toBeInTheDocument()
    })
  })

  it("renders a list of tickets when data is returned", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 1,
            ticketNumber: "TKT-2026-000001",
            summary: "Laptop battery drains quickly",
            category: "Hardware",
            requestedPriority: "MEDIUM",
            currentStatus: "NEW",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        meta: { page: 1, pageSize: 10, totalCount: 1, totalPages: 1 },
      }),
    } as Response)

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000001").length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText("Laptop battery drains quickly").length).toBeGreaterThan(0)
  })

  it("shows a no-results state when filters return zero matches", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        meta: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 },
      }),
    } as Response)

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by ticket number/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/search by ticket number/i), {
      target: { value: "nonexistent search term" },
    })

    await waitFor(() => {
      expect(screen.getByText(/no tickets match your current search/i)).toBeInTheDocument()
    })
  })

  it("shows a safe error message when the API call fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"))

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByText(/unable to load your tickets/i)).toBeInTheDocument()
    })
  })
})
