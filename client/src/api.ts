
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000"

export interface Category {
  id: number
  name: string
}

export interface SystemStatus {
  online: boolean
  categories: Category[]
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`)
  if (!healthRes.ok) {
    throw new Error("Backend health check failed")
  }
  const categoriesRes = await fetch(`${API_URL}/api/categories`)
  if (!categoriesRes.ok) {
    throw new Error("Failed to fetch categories")
  }
  const categories: Category[] = await categoriesRes.json()
  return { online: true, categories }
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`)
  if (!res.ok) throw new Error("Failed to fetch categories")
  return res.json()
}

export interface Requester {
  id: number
  name: string
  email: string
}

export async function fetchRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/requesters`)
  if (!res.ok) {
    throw new Error("Failed to fetch requesters")
  }
  return res.json()
}

export interface RelatedSystem {
  id: number
  name: string
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`)
  if (!res.ok) throw new Error("Failed to fetch related systems")
  return res.json()
}

export interface CreateTicketInput {
  requesterId: number
  categoryId: number
  relatedSystemId: number
  summary: string
  description: string
  requestedPriority: "LOW" | "MEDIUM" | "HIGH"
}

export interface Ticket {
  id: number
  ticketNumber: string
  requesterId: number
  categoryId: number
  relatedSystemId: number
  summary: string
  description: string
  requestedPriority: string
  currentStatus: string
  createdAt: string
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error?.message ?? "Failed to create ticket")
  }
  return res.json()
}

export interface TicketListItem {
  id: number
  ticketNumber: string
  summary: string
  category: string
  requestedPriority: string
  currentStatus: string
  createdAt: string
  updatedAt: string
}

export interface TicketListMeta {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface TicketListResponse {
  data: TicketListItem[]
  meta: TicketListMeta
}

export interface FetchTicketsParams {
  requesterId: number
  search?: string
  category?: number
  priority?: string
  status?: string
  sort?: string
  order?: "asc" | "desc"
  page?: number
  pageSize?: number
}

export async function fetchTickets(params: FetchTicketsParams): Promise<TicketListResponse> {
  const query = new URLSearchParams()
  query.set("requesterId", String(params.requesterId))
  if (params.search) query.set("search", params.search)
  if (params.category) query.set("category", String(params.category))
  if (params.priority) query.set("priority", params.priority)
  if (params.status) query.set("status", params.status)
  if (params.sort) query.set("sort", params.sort)
  if (params.order) query.set("order", params.order)
  if (params.page) query.set("page", String(params.page))
  if (params.pageSize) query.set("pageSize", String(params.pageSize))

  const res = await fetch(`${API_URL}/api/tickets?${query.toString()}`)
  if (!res.ok) {
    throw new Error("Failed to fetch tickets")
  }
  return res.json()
}
export interface AttachmentItem {
  id: number
  fileName: string
  fileType: string
  fileSize: number
  isRemoved: boolean
  removedAt?: string | null
  removedReason?: string | null
  uploadedAt: string
}

export interface TicketDetail {
  id: number
  ticketNumber: string
  summary: string
  description: string
  category: string
  relatedSystem: string
  requestedPriority: string
  currentStatus: string
  createdAt: string
  updatedAt: string
  attachments: AttachmentItem[]
}

export async function fetchTicketDetail(ticketId: number, requesterId: number): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}?requesterId=${requesterId}`)
  if (!res.ok) {
    throw new Error("Failed to fetch ticket detail")
  }
  return res.json()
}

export async function uploadAttachment(
  ticketId: number,
  requesterId: number,
  file: File
): Promise<AttachmentItem> {
  const formData = new FormData()
  formData.append("requesterId", String(requesterId))
  formData.append("file", file)

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error?.message ?? "Failed to upload attachment")
  }
  return res.json()
}

export function getAttachmentDownloadUrl(attachmentId: number, requesterId: number): string {
  return `${API_URL}/api/attachments/${attachmentId}/download?requesterId=${requesterId}`
}

export async function removeAttachment(
  attachmentId: number,
  requesterId: number,
  reason: string
): Promise<AttachmentItem> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/remove`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requesterId, reason }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error?.message ?? "Failed to remove attachment")
  }
  return res.json()
}
