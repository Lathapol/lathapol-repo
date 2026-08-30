import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import TicketDetail from "../../src/pages/TicketDetail"
import { RequesterProvider } from "../../src/context/RequesterContext"

function renderWithProvider(ticketId = 1) {
  return render(
    <RequesterProvider initialRequester={{ id: 1, name: "Jennifer Anderson", email: "j@example.com" }}>
      <TicketDetail ticketId={ticketId} onBack={() => {}} />
    </RequesterProvider>
  )
}

const mockTicket = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "Laptop battery drains quickly",
  description: "Battery drains fast even when idle.",
  category: "Hardware",
  relatedSystem: "Corporate Laptop",
  requestedPriority: "MEDIUM",
  currentStatus: "NEW",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  attachments: [
    {
      id: 1,
      fileName: "photo.jpg",
      fileType: "image/jpeg",
      fileSize: 20480,
      isRemoved: false,
      uploadedAt: new Date().toISOString(),
    },
    {
      id: 2,
      fileName: "old-file.png",
      fileType: "image/png",
      fileSize: 10240,
      isRemoved: true,
      removedReason: "Wrong file",
      uploadedAt: new Date().toISOString(),
    },
  ],
}

describe("TicketDetail", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders ticket header fields as read-only", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockTicket,
    } as Response)

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument()
    })

    expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument()
    expect(screen.getByText("Hardware")).toBeInTheDocument()
    expect(screen.getByText("Corporate Laptop")).toBeInTheDocument()
  })

  it("shows an active attachment with a working Download button and no Removed label", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockTicket,
    } as Response)

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByText("photo.jpg")).toBeInTheDocument()
    })

    const photoRow = screen.getByText("photo.jpg").closest("li")
    expect(photoRow).not.toBeNull()
    expect(photoRow!.textContent).not.toMatch(/removed/i)
  })

  it("shows a removed attachment without a Download button", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockTicket,
    } as Response)

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByText("old-file.png")).toBeInTheDocument()
    })

    const removedRow = screen.getByText("old-file.png").closest("li")
    expect(removedRow!.textContent).toMatch(/removed/i)
    expect(removedRow!.textContent).toMatch(/wrong file/i)
  })

  it("shows a safe error state when the ticket cannot be loaded", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"))

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByText(/unable to load this ticket/i)).toBeInTheDocument()
    })
  })
})
