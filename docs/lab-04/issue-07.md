# lab4 issue7 : Release integration and nine-part submission

Depends on #54 (PR #61, merged). Prepares the release of Lab 4 into main.

## This PR

- `reviewer.md` filled from the real GitHub reviews of PRs #56-#61 and the student's own peer reviews.
- `ai-use.md` written: assistant named, ten genuine user prompts, per-issue work summary, and a My Reflection draft marked for the student to rewrite.

## Release steps (recorded as they happen)

1. This documentation PR is reviewed and merged into lab4-staging.
2. A release PR merges lab4-staging into main after review.
3. The full verification (`node scripts/verify-lab4.cjs`) is run on a checkout made directly from origin/main, and the exact tested commit, commands and results are recorded in `artifacts/lab-04/verification/`.
4. The nine-part submission PDF is built from the versioned documents and real screenshots.

## Result

PR #62 (review and AI-use records) and PR #63 (lab4-staging into main) were approved by Kittakorn-P and merged; main is `a4dff3cd228463c841292927c352bdabe69305a5`. Step 3 ran on 2026-10-06 from a clean checkout of that exact commit and all eight checks passed (server 261 tests, client 59 tests, type checks, build, migration check, 12 Lab 4 and 15 Lab 3 browser scenarios). Logs and report.json are in `artifacts/lab-04/verification/`. The nine-part PDF is built separately from these versioned documents.
