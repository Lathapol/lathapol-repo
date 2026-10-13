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

## My Reflection (AI-assisted)

The main thing I learned in this lab is that a rule only counts if the backend enforces it. The rule that a ticket cannot be Resolved without an action taken is hidden in the screen, but the real check sits in the same transaction as the status change, so a direct request or two staff acting at the same time cannot get around it. The same idea applied to Actions Taken: the server sets who did it and when, a double click or retry cannot make a duplicate, and an out-of-date edit is refused instead of overwriting someone else's change.

Writing the contract first helped a lot. Decisions like the seven-day "recent" window, which statuses count as open, and where each dashboard card links were made once, so the later pull requests were easy for my coworker to review. Making every dashboard number equal the list it opens caught a real gap early. The browser tests found problems the API tests could not, such as a keyboard focus ring that Bootstrap was hiding, and changing the landing page to the dashboard quietly broke eleven older tests that I then had to update.

Working with an AI assistant went best when I gave short instructions and then checked the results myself: looking at the screenshots, asking my coworker to review, and reviewing my coworker's pull requests and asking for fixes. I also made one mistake with the workflow. I merged two of my coworker's pull requests when they wanted to hold one back, and I had to open a revert pull request. Next time I will confirm with my coworker before merging their work, run the full regression earlier, and keep each pull request small so the reviews stay useful.

This reflection was written by the assistant at my request from the actual work and review history, and I read and agreed with it before submitting.
