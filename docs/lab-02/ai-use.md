# Lab 2 - AI Use and Reflection

I used Claude (Anthropic) directly in chat, working alongside VS Code and
PowerShell to run commands and edit files.

## Selected Key Prompts

**Prompt Name:** Draft the Sprint Specification
**Actual Prompt Text:** Worked through the Lab 2 labsheet section by section, asking
for drafts of Business Rules, Functional Requirements, Acceptance Criteria, Data
Changes, API Contract, and Definition of Done for specification.md.
**My Reflection:** This was the most valuable use of AI in the whole lab - turning
an intentionally incomplete stakeholder request into 32 numbered business rules and
20 acceptance criteria that I could then actually build against.

**Prompt Name:** Design the Prisma Schema for Lab 2
**Actual Prompt Text:** Asked for a proposed schema covering RequesterUser,
RelatedSystem, Ticket, and Attachment models based on the relationships required
by the spec.
**My Reflection:** One-shot success. The soft-removal fields (isRemoved,
removedAt, removedReason) and the separate storedName vs fileName fields were
suggestions I wouldn't have thought of myself.

**Prompt Name:** Fix a "No seed command configured" and Prisma v7 seed error
**Actual Prompt Text:** Pasted the "Cannot find module '.prisma/client/default'"
and later a missing prisma.config.ts seed property error when adding
RequesterUser and RelatedSystem seed data.
**My Reflection:** Took a couple of rounds since Prisma v7's driver-adapter
pattern is different from older tutorials, but pasting the exact error each time
got it fixed quickly.

**Prompt Name:** Debug a flaky Ticket Number race condition
**Actual Prompt Text:** Pasted a Jest failure where POST /api/tickets returned
500 only when run alongside other test suites, not in isolation.
**My Reflection:** This was a genuinely subtle bug (count()-based sequencing
colliding under concurrent ticket creation). The fix - deriving the next number
from the last issued ticket plus a retry-on-conflict loop - only came after I
described the exact symptom (passes alone, fails together) rather than just
the error message.

**Prompt Name:** Fix broken JSX from a botched find-and-replace
**Actual Prompt Text:** Pasted a Vite parse error pointing at a stray `>` where
an `<a>` tag should have been, after a PowerShell regex replace silently
mangled the file.
**My Reflection:** Learned to verify file content directly with Select-String
after every PowerShell-based edit instead of trusting that a replace command
worked, since here-strings and quoting in PowerShell caused several silent
corruption issues during this lab.

**Prompt Name:** Write the Attachment Lifecycle Tests
**Actual Prompt Text:** Asked for Supertest coverage of the full attachment
lifecycle - upload, reject invalid type, retrieve, download, soft-remove,
block download of removed, and cross-requester rejection - including generating
a real in-memory PNG fixture for the upload test.
**My Reflection:** Having one test file cover the entire lifecycle end-to-end
made it much easier to trust the feature was actually done, not just that
each endpoint returned 200 in isolation.

**Prompt Name:** Set Up Playwright E2E and Responsive Screenshots
**Actual Prompt Text:** Asked for a full requester-to-ticket E2E flow test and a
separate script to capture desktop/tablet/mobile screenshots of all three main
screens.
**My Reflection:** Had to fix a few Playwright strict-mode "multiple elements
found" errors (My Tickets text existing in both the button and the heading) and
a locator that grabbed a hidden desktop table row at mobile width instead of the
visible mobile card - useful reminder that responsive UIs need viewport-aware
test selectors, not just one generic locator.

## Reflection

The specification-first workflow this lab required (writing business rules and
acceptance criteria before touching code) made a real difference - almost every
feature I built matched the spec on the first implementation pass because the
edge cases were already decided in writing. The recurring friction point was
PowerShell itself: several file edits I asked for got silently corrupted by
quoting or regex issues, and I learned to always verify saved file content with
Select-String before trusting that an edit worked, rather than assuming success
from a command that returned no error.
