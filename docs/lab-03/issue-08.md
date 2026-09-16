# lab3 issue8 : Release integration and submission

## Cleanup prepared

- README setup now uses the actual clone directory, deployed migrations, repeatable seed and isolated test instructions.
- Added server/.env.example with placeholder credentials. Private environments, uploads, builds and transient browser outputs are ignored.
- Replaced accidental shell commands in .gitattributes with real text/binary attributes; no bulk renormalization.
- Stopped tracking the transient Playwright .last-run.json while retaining the local file and historical verification evidence.
- The supplied Lab 2 PDF supplies the cover identity and layout reference.

## Remaining release steps

1. Coworker reviews the cleanup PR into lab3-staging.
2. Coworker reviews and merges the lab3-staging to main release PR.
3. Rerun scripts/verify-lab3.cjs on the merged main commit using isolated test services; record that exact hash and outputs.
4. Confirm the AI-assisted reflection, update completed issue/project status, and regenerate the nine-part PDF with final evidence.

Issue 8 remains open until these steps finish. A draft PDF is not final-main or completed submission evidence.
