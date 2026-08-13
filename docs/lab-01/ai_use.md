# Lab 1 — AI Use and Reflection

I used Claude directly in chat, working alongside VS Code to run 
commands and edit files.


## Selected Key Prompts
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|


**Prompt Name:** Understand the Lab 1 Requirements
**Actual Prompt Text:** "summarize me this and walk me through the step" (with the 
Lab 1 labsheet PDF attached)
**My Reflection:** This worked well in one shot and gave me a clear roadmap of the 
4 Issues, branch structure, and submission format to follow for the rest of the lab.

**Prompt Name:** Scaffold the Full-Stack Project
**Actual Prompt Text:** "how to do Start scaffolding: Vite+React+TS frontend, 
Express+TS backend, Prisma+Postgres, etc."
**My Reflection:** Took many follow-up steps since I ran into several environment 
issues along the way (PostgreSQL not installed, PATH not configured, TypeScript 
version conflicts breaking ts-node-dev).

**Prompt Name:** Debug ts-node-dev Crash
**Actual Prompt Text:** Pasted the exact `TypeError: Cannot read properties of 
undefined (reading 'fileExists')` error from my terminal.
**My Reflection:** This one-shot fixed it — the issue was TypeScript 7.0.2 being 
too new for ts-node, so downgrading to 5.6.3 solved it immediately.

**Prompt Name:** Fix Tangled Git Branches
**Actual Prompt Text:** Pasted my `git log --oneline --graph --all` output after 
noticing Issue 1 and Issue 2's work had landed on the same commit.
**My Reflection:** Took a few exchanges to fully untangle — had to merge the 
commit onto the correct branch, then delete and recreate the dependent branch 
fresh off the corrected lab1-staging.

**Prompt Name:** Fix Prisma Seed Script Error
**Actual Prompt Text:** Pasted the `Cannot find module '.prisma/client/default'` 
error when running `npx prisma db seed`.
**My Reflection:** Took two rounds — first fix (generating the client) wasn't 
enough, second round we found Prisma v7 uses a custom generated client path and 
driver adapters instead of the old default import.

**Prompt Name:** Write Supertest and Vitest Tests
**Actual Prompt Text:** "Cannot find name 'describe'..." (pasted the TypeScript 
error when writing my first test file)
**My Reflection:** One-shot fix — turned out my tsconfig.json didn't include the 
tests folder, so TypeScript didn't know Jest's globals applied there.

**Prompt Name:** Verify Final Merge into Main
**Actual Prompt Text:** "ok finished that" (after merging lab1-staging into main)
**My Reflection:** Good thing I asked for a sanity check — turned out my first 
main merge had captured a stale snapshot missing Issues 2–4, and I had to open 
a second PR to actually bring everything in.

## Reflection

Pasting exact error messages and terminal output instead of vague descriptions made 
my prompts way more effective — I got fixes in one or two tries instead of going in 
circles. The biggest correction I made was catching a Git mistake myself: after 
merging what I thought was everything into main, I double-checked with `git log` and 
found Issues 2–4 were actually missing, so I had to open a second PR to fix it.
