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

  return { online: true, categories: [] }
}