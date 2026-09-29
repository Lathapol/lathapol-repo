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

No final-main result is claimed until step 3 has run.
