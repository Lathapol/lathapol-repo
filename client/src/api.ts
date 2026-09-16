
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
  const healthRes = await apiFetch(`${API_URL}/api/health`)
  if (!healthRes.ok) {
    throw new Error("Backend health check failed")
  }
  const categoriesRes = await apiFetch(`${API_URL}/api/categories`)
  if (!categoriesRes.ok) {
    throw new Error("Failed to fetch categories")
  }
  const categories: Category[] = await categoriesRes.json()
  return { online: true, categories }
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await apiFetch(`${API_URL}/api/categories`)
  if (!res.ok) throw new Error("Failed to fetch categories")
  return res.json()
}

export interface Requester {
  id: number
  name: string
  email: string
}

export async function fetchRequesters(): Promise<Requester[]> {
  const res = await apiFetch(`${API_URL}/api/requesters`)
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
  const res = await apiFetch(`${API_URL}/api/related-systems`)
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
  const res = await apiFetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({...input,requesterId:undefined}),
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

  if (params.search) query.set("search", params.search)
  if (params.category) query.set("category", String(params.category))
  if (params.priority) query.set("priority", params.priority)
  if (params.status) query.set("status", params.status)
  if (params.sort) query.set("sort", params.sort)
  if (params.order) query.set("order", params.order)
  if (params.page) query.set("page", String(params.page))
  if (params.pageSize) query.set("pageSize", String(params.pageSize))

  const res = await apiFetch(`${API_URL}/api/tickets?${query.toString()}`)
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
  requester?: { name: string }
  owner?: QueueOwner | null
  ownerId?: number | null
  itPriority?: string
  version?: number
  requesterResolvedAt?: string | null
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

export async function fetchTicketDetail(ticketId: number, _requesterId: number): Promise<TicketDetail> {
  const res = await apiFetch(`${API_URL}/api/tickets/${ticketId}`)
  if (!res.ok) {
    throw new Error("Failed to fetch ticket detail")
  }
  return res.json()
}

export async function uploadAttachment(
  ticketId: number,
  _requesterId: number,
  file: File
): Promise<AttachmentItem> {
  const formData = new FormData()

  formData.append("file", file)

  const res = await apiFetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error?.message ?? "Failed to upload attachment")
  }
  return res.json()
}

export function getAttachmentDownloadUrl(attachmentId: number, _requesterId: number): string {
  return `${API_URL}/api/attachments/${attachmentId}/download`
}

export async function removeAttachment(
  attachmentId: number,
  _requesterId: number,
  reason: string
): Promise<AttachmentItem> {
  const res = await apiFetch(`${API_URL}/api/attachments/${attachmentId}/remove`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error?.message ?? "Failed to remove attachment")
  }
  return res.json()
}

let csrfToken = ''
export function setCsrfToken(value:string){csrfToken=value}
async function apiFetch(url:string,options:RequestInit={}) {
  const headers=new Headers(options.headers)
  if(options.method && !['GET','HEAD'].includes(options.method) && csrfToken) headers.set('X-CSRF-Token',csrfToken)
  const res=await fetch(url,{...options,headers,credentials:'include'})
  if(!res.ok){
    const body=await res.clone().json().catch(()=>null)
    if(res.status===401 && !url.endsWith('/auth/login'))window.dispatchEvent(new Event('session-expired'))
    if(body?.error?.code==='PASSWORD_CHANGE_REQUIRED')window.dispatchEvent(new Event('password-required'))
    throw Object.assign(new Error(body?.error?.message || 'Unable to complete the request. Please retry.'),{status:res.status})
  }
  return res
}
export async function authRequest(path:string,body?:object){
  const response=await apiFetch(`${API_URL}/api/auth${path}`,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  return response.status===204?undefined:response.json()
}

export interface QueueOwner { id: number; name: string; role: string; isActive: boolean }
export interface QueueTicket extends TicketListItem {
  itPriority: string
  requester: { id: number; name: string }
  owner: { id: number; name: string } | null
}
export interface QueueResponse { data: QueueTicket[]; meta: TicketListMeta }
export async function fetchQueue(params: Record<string, string>): Promise<QueueResponse> {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== ''))
  return (await apiFetch(`${API_URL}/api/staff/tickets?${query}`)).json()
}
export async function fetchOwners(): Promise<QueueOwner[]> {
  return (await apiFetch(`${API_URL}/api/staff/owners`)).json()
}

export interface TicketEntry { id: number; body: string; createdAt: string; author: { id: number; name: string } }
export async function fetchEntries(id: number, kind: 'comments' | 'notes'): Promise<TicketEntry[]> {
  return (await apiFetch(`${API_URL}/api/tickets/${id}/${kind}`)).json()
}
export async function postEntry(id: number, kind: 'comments' | 'notes', body: string): Promise<TicketEntry> {
  return (await apiFetch(`${API_URL}/api/tickets/${id}/${kind}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body})})).json()
}
export async function updateWorkflow(id: number, data: { version: number; ownerId?: number | null; itPriority?: string; currentStatus?: string; confirmed?: boolean }, claim = false) {
  return (await apiFetch(`${API_URL}/api/staff/tickets/${id}${claim ? '/claim' : ''}`, {method:claim?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).json()
}
export async function appearsResolved(id: number) {
  return (await apiFetch(`${API_URL}/api/tickets/${id}/appears-resolved`, {method:'POST'})).json()
}

export interface ManagedUser { id: number; name: string; email: string; role: 'REQUESTER'|'IT_STAFF'|'ADMINISTRATOR'; isActive: boolean; mustChangePassword: boolean }
export type UserFields = Pick<ManagedUser,'name'|'email'|'role'|'isActive'>
export async function fetchUsers(search = '', role = ''): Promise<ManagedUser[]> {
  const query=new URLSearchParams();if(search)query.set('search',search);if(role)query.set('role',role)
  return (await apiFetch(`${API_URL}/api/users?${query}`)).json()
}
export async function saveUser(data:UserFields & {initialPassword?:string},id?:number):Promise<ManagedUser> {
  return (await apiFetch(`${API_URL}/api/users${id?`/${id}`:''}`,{method:id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).json()
}
export async function resetUserPassword(id:number,initialPassword:string):Promise<ManagedUser> {
  return (await apiFetch(`${API_URL}/api/users/${id}/initial-password`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initialPassword})})).json()
}
