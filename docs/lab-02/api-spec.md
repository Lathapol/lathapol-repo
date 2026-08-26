# Lab 2 API Contract

## Conventions
- All list endpoints return `{ data: [...], meta: { page, pageSize, totalCount, totalPages } }`
- All error responses return `{ error: { code: string, message: string } }`
- `requesterId` is passed as a query param (GET) or body field (POST/PATCH) to 
  simulate ownership, since there is no session yet (Lab 2 limitation, see 
  specification.md Section 11)

---

## GET /api/categories
Retrieve active Categories.
**Response 200:**
```json
[{ "id": 1, "name": "Hardware" }]
```

## GET /api/related-systems
Retrieve active Related Systems.
**Response 200:**
```json
[{ "id": 1, "name": "VPN" }]
```

## GET /api/requesters
Retrieve active Development Requesters.
**Response 200:**
```json
[{ "id": 1, "name": "Jennifer Anderson", "email": "jennifer@example.com" }]
```

---

## POST /api/tickets
Create a Ticket for the selected Requester.

**Request body:**
```json
{
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 3,
  "summary": "Laptop battery drains quickly",
  "description": "Battery drains fast even when idle.",
  "requestedPriority": "MEDIUM"
}
```

**Response 201:**
```json
{
  "id": 10,
  "ticketNumber": "TKT-2026-000010",
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 3,
  "summary": "Laptop battery drains quickly",
  "description": "Battery drains fast even when idle.",
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
  "createdAt": "2026-08-20T10:00:00Z"
}
```

**Errors:**
- 400 — missing/invalid fields (summary/description length, invalid category/priority)
- 404 — requesterId does not match an active Requester
- 500 — unexpected server error (safe generic message)

---

## GET /api/tickets
Retrieve the selected Requester's own Tickets, paginated/filtered/sorted.

**Query params:**
- `requesterId` (required)
- `search` — matches Ticket Number or Summary
- `category`, `priority`, `status` — filters
- `sort` — one of `createdAt`, `updatedAt`, `ticketNumber`; default `createdAt`
- `order` — `asc` | `desc`; default `desc`
- `page` (default 1), `pageSize` (default 10, max 50)

**Response 200:**
```json
{
  "data": [
    { "id": 10, "ticketNumber": "TKT-2026-000010", "summary": "...", 
      "category": "Hardware", "requestedPriority": "MEDIUM", 
      "currentStatus": "NEW", "updatedAt": "2026-08-20T10:00:00Z" }
  ],
  "meta": { "page": 1, "pageSize": 10, "totalCount": 42, "totalPages": 5 }
}
```

**Errors:**
- 400 — invalid query params (bad sort field, page < 1)
- 404 — requesterId not found

---

## GET /api/tickets/:id
Retrieve one owned Ticket with its Attachments.

**Query params:** `requesterId` (required)

**Response 200:**
```json
{
  "id": 10,
  "ticketNumber": "TKT-2026-000010",
  "summary": "...",
  "description": "...",
  "category": "Hardware",
  "relatedSystem": "Corporate Laptop",
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
  "createdAt": "...",
  "updatedAt": "...",
  "attachments": [
    { "id": 5, "fileName": "photo.jpg", "fileType": "image/jpeg", 
      "fileSize": 204800, "isRemoved": false, "uploadedAt": "..." }
  ]
}
```

**Errors:**
- 403/404 — Ticket does not belong to requesterId (do not leak existence)

---

## POST /api/tickets/:id/attachments
Upload an Attachment to an owned Ticket. `multipart/form-data`.

**Fields:** `requesterId`, `file`

**Response 201:**
```json
{ "id": 6, "fileName": "receipt.pdf", "fileType": "application/pdf", 
  "fileSize": 102400, "isRemoved": false, "uploadedAt": "..." }
```

**Errors:**
- 400 — unsupported file type, file > 5MB, or Ticket already has 5 active Attachments
- 403/404 — Ticket does not belong to requesterId

---

## GET /api/attachments/:id
Retrieve Attachment metadata (works whether active or removed).

**Query params:** `requesterId` (required)

**Response 200:**
```json
{ "id": 6, "fileName": "receipt.pdf", "isRemoved": false, "uploadedAt": "..." }
```

**Errors:** 403/404 — not owned by requesterId

---

## GET /api/attachments/:id/download
Download an active Attachment's file bytes.

**Query params:** `requesterId` (required)

**Response 200:** binary file stream with appropriate Content-Type

**Errors:**
- 403/404 — not owned by requesterId
- 410 — Attachment has been soft-removed (Gone)

---

## PATCH /api/attachments/:id/remove
Soft-remove an owned Attachment.

**Request body:**
```json
{ "requesterId": 1, "reason": "Wrong file attached" }
```

**Response 200:**
```json
{ "id": 6, "isRemoved": true, "removedAt": "...", "removedReason": "Wrong file attached" }
```

**Errors:**
- 403/404 — not owned by requesterId
- 409 — Attachment already removed