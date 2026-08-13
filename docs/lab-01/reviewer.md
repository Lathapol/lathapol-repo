# Lab 1 — Peer Review Record

**Author:** Lathapol Srikhiao — 67070503475 — GitHub: @Lathapol
**Peer reviewer:** Kittakorn Poungpien — 67070503401 — GitHub: @Kittakorn-P

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #5 | feature/1-project-foundation | Approved |
| #7 | feature/2-health-check | Approved |
| #8 | feature/3-category-seed | Approved |
| #10 | feature/4-category-list | Approved |

**Reviewer comment I received (PR #7, API health check):**
"Health endpoint returns the correct status. JSON shape tested it locally matches the lab."

**How I responded:**
"Thank for the reviews"

**Reviewer comment I received (PR #8, Category seed):**
"Checked the schema, migration, and seed script all match the lab criteria."

**How I responded:**
"ok i also check yours too so see in the issues."

**Reviewer comment I received (PR #10, Category list UI):**
"Great style! everything seem work accordingly to the lab1 criteria."

**How I responded:**
"great so then after i review yours we can both merge"

**Reviewer comment I received (PR #5, Project foundation):**
"Too much file have been change but all an all work just fine according to the lab issue1."

**How I responded:**
"sorry for the files amount i accidentally merge brach together so i need to pul them out"

## Pull Requests I reviewed for my partner

I reviewed my partner's Issue 3 (Create and seed IT request categories) and Issue 4 
(Display the IT request category list) pull requests.

**My comment (Issue 3):** Checked the schema, migration, and seed script — all 
match the spec. Ran the seed twice locally and confirmed no duplicates were 
created. Categories match the required names exactly. Approving.

**Partner's response:** Approved and merged after confirming.

**My comment (Issue 4):** Pulled the branch and tested locally — /api/categories 
returns the 4 seeded categories in id order, and the Supertest test covers it. On 
the frontend, the category list renders from the real API response, and 
loading/error states both work as expected. Approving — nice work.

**Partner's response:** Approved and merged after confirming.