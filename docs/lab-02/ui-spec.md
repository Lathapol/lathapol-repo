# Lab 2 UI Specification — Zen Green Theme

## 1. Color Tokens

| Token | Value | Usage |
|---|---|---|
| Primary green | #006B3C | App header, primary buttons, strong emphasis |
| Secondary green | #0B7A46 | Active tabs, focus accents, links, hover states |
| Pale green | #EAF6EF | Selected/success/subtle section emphasis backgrounds |
| Page background | #F5F7F6 | Overall page background |
| Surface/cards | White, subtle border, restrained shadow | Content containers |
| Text | Dark charcoal-green (#1F2A24), not pure black | Body text |
| Editable field | White bg, neutral gray border | Input, select, textarea |
| Read-only field | Soft gray-green (#EDF1EE) or warm ivory shading | Non-editable display fields |
| Error | Dark red (#B3261E) text/border | Validation messages, invalid fields |
| Warning | Amber (#B77900) callout/badge | Non-blocking cautions only |
| Success | Green confirmation, readable text, not color-only | Success states |

## 2. Typography & Spacing
- Base font size: 16px, headings scale up (h1: 28px, h2: 22px, h3: 18px)
- Consistent 8px spacing unit; form field vertical gap: 16px; section gap: 32px
- Labels: 14px, medium weight, positioned above their control

## 3. Field States
- **Editable:** white background, 1px neutral border, darker border + secondary 
  green focus ring on focus
- **Read-only:** soft gray-green background, no border emphasis, cursor: default
- **Invalid:** red border, red helper text directly below the field
- **Disabled:** reduced opacity (0.5), background gray, not clickable/focusable
- **Focused:** visible 2px secondary-green outline for keyboard navigation

## 4. Required-Field Marker & Validation Placement
- Required fields show a red asterisk (*) immediately after the label text
- Validation messages appear directly below their field, never only as a top-of-form banner
- Messages use the error color token and a short, specific message (e.g. "Summary must be at least 5 characters")

## 5. Button Hierarchy
| Type | Style |
|---|---|
| Primary | Solid primary green background, white text (e.g. Submit, Continue) |
| Secondary | White background, secondary-green border and text (e.g. Cancel) |
| Tertiary | Text-only, secondary-green (e.g. "Clear Filters") |
| Destructive | Red text/border (e.g. "Remove Attachment") |
| Disabled | Gray background/text, no hover effect, not clickable |
| Busy | Primary style with spinner icon + disabled state, text changes to reflect progress (e.g. "Submitting...") |

## 6. Attachment Selection & Errors
- File picker shows selected file name(s), size, and a remove-before-upload (x) control
- Invalid file (wrong type/too large) shows an inline red error message next to that file, does not block other valid files
- Upload progress shown per file if async; failed uploads marked clearly with a retry option

## 7. Screen States (all screens)
Every screen/section must implement, at minimum:
- **Initial** — first load, no data yet requested or shown
- **Loading** — spinner/skeleton while fetching
- **Success** — data displayed normally
- **Empty** — zero records exist (distinct wording from "no results")
- **No results** — filters/search applied but nothing matches
- **Validation** — inline field errors, form not submitted
- **Submitting** — busy state, controls disabled
- **Failure** — safe error message, retry option where applicable, entered data preserved

## 8. Responsive Layout Rules

| Viewport | Behavior |
|---|---|
| Desktop ≥992px | Multi-column layout; content max-width ~1200px, centered |
| Tablet 768-991px | Two-column layout where practical; Summary/Description get full width |
| Mobile <768px | Fields stack vertically; buttons full-width and touch-friendly (min 44px height); no horizontal scroll |
| All sizes | No clipped labels, overlapping messages, hidden buttons, or unreadable attachment names |

## 9. Accessibility
- All interactive controls are keyboard-reachable via Tab, with visible focus rings
- Icon-only buttons have an `aria-label` and a tooltip
- Status/priority badges use text + color together, never color alone, to remain readable for colorblind users
- Form errors are associated with their field via `aria-describedby`

## 10. Application Shell
- Header: TokTickIT logo/title (left), "My Tickets" and "Create Ticket" nav links (center/left-aligned), current Development Requester name + "Change Requester" action + profile icon (right)
- Active nav link is visually distinguished (secondary green underline or background)
- Mobile: nav collapses into a hamburger/menu icon; requester identity remains visible

## 11. Development Requester Selection Screen
- Centered card layout, icon + "Select Development Requester" heading
- Dropdown of active Requesters (name shown, sourced from GET /api/requesters)
- Info banner: "Only active development requesters are shown."
- Secondary banner: "Authentication coming in Lab 3" explanatory note
- Continue button (primary, disabled until a Requester is selected)
- Loading state while fetching Requesters
- Empty state if zero active Requesters exist (blocks Continue)
- Failure state if the API call fails

## 12. Create Ticket Screen
- Layout order (per labsheet example): system-generated fields (Ticket Number 
  placeholder/read-only until created) near top → classification fields (Category, 
  Related System, Requested Priority) grouped together → Summary and Description 
  given full width and sufficient height → Attachments section below → primary 
  (Submit) and secondary (Cancel) actions at bottom
- Ticket Number field: shown as read-only placeholder ("Will be assigned after submission") before creation, populated after success
- Requester field: read-only, shows currently selected Development Requester name
- All states from Section 7 apply (initial, validation, submitting, success with Ticket Number displayed, API failure with values preserved, invalid-attachment handling)

## 13. My Tickets Screen
- Header: "My Tickets" title + subtitle, "Clear Filters" (secondary) and "Create 
  Ticket" (primary) buttons top-right
- Filter row: search box, Category dropdown, Requested Priority dropdown, Current 
  Status dropdown — all combinable
- Desktop: table with sortable columns (click header to sort) — Ticket No., Created 
  Date, Summary, Category, Requested Priority, Current Status, Last Updated
- Mobile: card-per-ticket layout instead of table, same information reorganized vertically
- Pagination controls at bottom (Previous/page numbers/Next), shows "Showing X to Y of Z tickets"
- Badge styling consistent for Requested Priority and Current Status (pale-green/amber/red-tinted badges with text labels)
- Empty state (zero tickets ever) vs No-results state (filtered to zero) are visually distinct messages

## 14. Requester Ticket Detail Screen
- Breadcrumb: "My Tickets > Ticket Details" with back navigation
- Ticket header info displayed in a read-only grid (Ticket No., Date, Category, 
  Related System, Requester, Requested Priority, Current Status, Summary, Description)
- Attachments section clearly separated below/beside header info, not mixed into it
- Each attachment row: file name, size, upload date, download icon (active only), 
  remove icon (active only, opens confirmation + reason prompt)
- Removed attachments shown grayed-out/struck-through with "Removed" label, no download/preview control available
- No Public Comments, Internal Notes, Actions Taken, or status-change controls present (explicitly out of scope)

## 15. Screenshot Evidence Paths
- artifacts/lab-02/screenshots/create-ticket/ — desktop, tablet, mobile, all states
- artifacts/lab-02/screenshots/my-tickets/ — desktop, tablet, mobile, all states
- artifacts/lab-02/screenshots/ticket-detail/ — desktop, tablet, mobile, all states

## 16. Visual Checklist (to complete during implementation)
- [ ] Colors match tokens exactly (no ad-hoc greens)
- [ ] Editable vs read-only fields are visually distinct
- [ ] Validation messages appear below their field, not only at top
- [ ] Button hierarchy is consistent across all screens
- [ ] No clipped labels or overlapping messages at any viewport
- [ ] No unintended horizontal scrolling on mobile
- [ ] Priority/Status badges are consistent and legible
- [ ] Empty state and no-results state are visually distinguishable
## 17. Visual Checklist - Completed

- [x] Colors match tokens (primary green #006B3C used for header/nav, success/warning badges applied consistently)
- [x] Editable vs read-only fields are visually distinct (read-only fields use #EDF1EE gray-green shading throughout Create Ticket and Ticket Detail)
- [x] Validation messages appear below their field, not only at top (confirmed on Create Ticket: Category, Related System, Summary, Description each show inline errors)
- [x] Button hierarchy is consistent across all screens (primary green Submit/Create Ticket buttons, outline secondary for Cancel/Clear Filters, outline danger for Remove)
- [x] No clipped labels or overlapping messages at any viewport (confirmed via Playwright screenshots at 1280px, 850px, 375px widths)
- [x] No unintended horizontal scrolling on mobile (confirmed: My Tickets switches to card layout below 768px instead of a horizontally-scrolling table)
- [x] Priority/Status badges are consistent and legible (badges use both color and text label, not color alone)
- [x] Empty state and no-results state are visually distinguishable (different message text confirmed for zero-tickets vs filtered-to-zero scenarios)
