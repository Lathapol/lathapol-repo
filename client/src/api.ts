const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

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
    throw new Error('Backend health check failed')
  }

  const categoriesRes = await fetch(`${API_URL}/api/categories`)
  if (!categoriesRes.ok) {
    throw new Error('Failed to fetch categories')
  }
  const categories: Category[] = await categoriesRes.json()

  return { online: true, categories }
}

export interface Requester {
  id: number
  name: string
  email: string
}

export async function fetchRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/requesters`)
  if (!res.ok) {
    throw new Error('Failed to fetch requesters')
  }
  return res.json()
}

export interface RelatedSystem {
  id: number
  name: string
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`)
  if (!res.ok) throw new Error('Failed to fetch related systems')
  return res.json()
}

export interface CreateTicketInput {
  requesterId: number
  categoryId: number
  relatedSystemId: number
  summary: string
  description: string
  requestedPriority: 'LOW' | 'MEDIUM' | 'HIGH'
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error?.message ?? 'Failed to create ticket')
  }

  return res.json()
}

export interface Category {
  id: number
  name: string
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`)
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}