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