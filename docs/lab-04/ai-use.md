# Lab 4 AI-use record

Assistant: Claude (model Claude Sonnet 5) used through Claude Code in the Claude desktop app, for both the specification (contract) work and the coding work. The specification was written by the assistant from the Lab 4 handout and reviewed by the coworker in PR #56 before any implementation PR was merged.

Selected genuine user prompts (actual messages from the working conversation; typos kept):
1. Attached SE Lab 4.pdf and the repository link with: "this is for my ticktokIT for my software engi work"
2. Answered the assistant's setup question with the local repository ("It's already local") and: "walk me through tell me what i need to do and what 're we're doing e=for each issues then you do it and told me when finish"
3. Attached the Lab 3 submission PDF with: "go and this is my lab3 for ref"
4. Attached a screenshot of the GitHub Project board with: "also do these and you can automatically open a pull req for me"
5. "also look at my prvious format when creating issues make the name easy to read like mine too and answering comment and commented on my peer pullreq liek what i do too copy my style"
6. "dont forhget to do the broad too"
7. "chekc my freind pull req", followed by "yeah tell him that" and "ok he said he fixed it"
8. "both my issuse 1 and 2 are merge proceed on issues 3"
9. "let do issues 4 now", "proceed on with issues 5", "contionue with issuse 6"
10. "how much issues we have left", then "let go on issues 7"

Work by issue (evidence is in each issue-0X.md; approvals are in reviewer.md):
- Issue 1: the assistant read the handout and the Lab 3 repository, then drafted the engineering contract, API and UI specifications and the test plan before any code. Two database decisions (a separate ActionTaken table; no delete and no client timestamps, with an idempotency key) are justified in specification.md.
- Issue 2: additive migration, idempotent seed and the Actions Taken API with tests. A reviewer-facing note: a first attempt at keeping the repository's mixed line endings produced a noisy diff, which was redone so the pull request shows only the real changes.
- Issue 3: Actions Taken screen with create/edit, read-only requester view and responsive layout, checked with component and browser tests at three viewports.
- Issue 4: the resolution gate (a ticket cannot become Resolved without an action), checked under the ticket lock. This changed Lab 3 behavior, so the Lab 3 fixtures and browser flow were updated.
- Issue 5: backend-calculated dashboards whose counts equal their drill-down lists. Landing on a dashboard changed the first screen for every role, so eleven existing browser tests were updated.
- Issue 6: removed leftover Lab 2 code, restored a visible keyboard focus ring that Bootstrap was hiding (found by the new accessibility browser test), added the integrated verification script and updated the README.
- The student also reviewed the coworker's Lab 4 pull requests; see reviewer.md.

No test result, approval or reflection in this file was invented. Prompts written by the assistant are not attributed to the student.

## My Reflection

> DRAFT written by the assistant for the student to read, correct and rewrite in their own words before submission. It is not evidence that the student personally ran the assistant's tests.

The biggest lesson of this lab is that a rule such as "a ticket cannot be resolved without documented work" only counts if the backend enforces it. The screen already hides the option, but the real check has to live in the same transaction as the status change, otherwise a direct request or two staff acting at once can bypass it. The same idea applied to Actions Taken: the performer and time come from the server, a repeat click cannot create a duplicate, and an out-of-date edit is refused instead of silently overwriting someone else.

Writing the contract first made the later issues easier to review, because decisions such as the seven-day "recent" window, the open-ticket group and where each dashboard card links were settled once. Making every dashboard number match the list it opens caught a real gap early. The browser tests also found problems that API tests could not, such as a hidden keyboard focus ring, and a change to the landing page that quietly broke eleven older tests.

Working with an AI assistant was fastest when I gave short instructions and checked the results myself: reading the screenshots, asking my coworker to review, and reviewing my coworker's pull request and asking for fixes. Next time I would run the full regression earlier and keep the pull requests small, since the review comments were most useful when each pull request did one thing.
