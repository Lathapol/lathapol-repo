# Lab 3 REST API

Base /api, JSON except multipart upload and file download. Health is public; login is public JSON. All other routes require a cookie session. User DTO: {id,name,email,role,isActive,mustChangePassword}; never passwordHash. Auth response: {user,csrfToken}. Supply X-CSRF-Token on authenticated POST/PATCH/DELETE. Browser Origin must match APP_ORIGIN (default http://localhost:5173). Nonbrowser clients may omit Origin but still need CSRF for session writes. Cookie toktickit_session is HttpOnly, SameSite=Lax, path=/, 8 hours; Secure in production. Logout clears it and deletes the session. All API responses use Cache-Control: no-store.

Errors: {error:{code,message}}. 400 invalid input/JSON/query, 401 missing/invalid/expired session or invalid login, 403 role/password-change/CSRF/origin denial, 404 missing/foreign resource, 409 duplicate/stale/invalid transition/admin safety, 410 removed file, 429 login limit, 500 generic failure. Unknown API route 404. No error contains internal DB details.

| Method / endpoint | Input | Success | Permission |
|---|---|---|---|
| POST /auth/login | {email,password} | 200 auth response + cookie | Public |
| GET /auth/me | - | 200 auth response | Any session |
| POST /auth/change-password | {currentPassword,newPassword,confirmPassword} | 200 auth response + rotated cookie | Any session + CSRF |
| POST /auth/logout | - | 204 clear cookie | Any session + CSRF |
| GET /categories; /related-systems | - | 200 [{id,name}] | All completed users |
| POST /tickets | {categoryId,relatedSystemId,summary,description,requestedPriority} | 201 ticket | Requester |
| GET /tickets | query below | 200 {data,meta} | Requester, own |
| GET /tickets/:id | positive ID | 200 detail | Owner/Staff/Admin |
| POST /tickets/:id/attachments | multipart file | 201 safe attachment metadata | Owning Requester |
| GET /attachments/:id | positive ID | 200 metadata | Owner/Staff/Admin |
| GET /attachments/:id/download | positive ID | 200 attachment download | Owner/Staff/Admin |
| PATCH /attachments/:id/remove | {reason}, <=500 chars | 200 removed metadata | Owning Requester |
| GET /staff/tickets | queue query below | 200 {data,meta} | Staff/Admin |
| GET /staff/owners | - | 200 [{id,name,role,isActive}] | Staff/Admin |
| POST /staff/tickets/:id/claim | {version} | 200 updated ticket | Staff |
| PATCH /staff/tickets/:id | {version,ownerId?,itPriority?,currentStatus?,confirmed?} | 200 updated ticket | Staff |
| GET /tickets/:id/comments | - | 200 entry[] | Owner/Staff/Admin |
| POST /tickets/:id/comments | {body} | 201 entry | Owner/Staff |
| GET /tickets/:id/notes | - | 200 entry[] | Staff/Admin |
| POST /tickets/:id/notes | {body} | 201 entry | Staff |
| POST /tickets/:id/appears-resolved | - | 200 {requesterResolvedAt} | Owning Requester |
| GET /users | search? name/email <=200, role? | 200 User[] | Admin |
| POST /users | {name,email,role,isActive,initialPassword} | 201 User | Admin |
| PATCH /users/:id | {name,email,role,isActive} | 200 User | Admin |
| POST /users/:id/initial-password | {initialPassword} | 200 User with mustChangePassword=true | Admin |

The removed /requesters endpoint returns 404. Client requesterId is ignored, never authorization. Detail DTO preserves Lab 2 category/relatedSystem names and attachment DTOs; adds requester{name}, owner{id,name,role,isActive}|null, ownerId, itPriority, version, requesterResolvedAt. It never embeds notes. Entry DTO: {id,body,createdAt,author:{id,name}}.

Requester list search: ticket number/summary case-insensitive contains (max 200); category positive integer; priority LOW/MEDIUM/HIGH; status one of eight values. Staff adds owner=all|mine|unassigned|positive ID, priority refers to IT priority. Defaults: createdAt desc, page=1, pageSize=10. Allowed sort createdAt,updatedAt,ticketNumber (staff also itPriority), order asc|desc. Tie-break by id in same direction. page/pageSize positive integer, size <=50; malformed queries 400. Valid page beyond last clamps to last; totalPages at least 1. meta={page,pageSize,totalCount,totalPages}. Staff rows additionally include owner, itPriority, requester name. Filters AND together; search terms OR across two fields.

Staff updates whitelist the four operational fields and version/confirmed; unknown fields are rejected. ownerId may be null to unassign. version is a nonnegative integer; update increments atomically. Claim requires unassigned + expected version. Transition matrix in specification.md is authoritative. Enum priority sorting uses PostgreSQL enum order LOW,MEDIUM,HIGH.

Initial password issuance is manual local-lab behavior: Administrator enters a password, server hashes it and invalidates sessions; it is never returned in user lists. UI clears password inputs on success. Database uniqueness and serialized last-admin checks resolve concurrent edits safely.
