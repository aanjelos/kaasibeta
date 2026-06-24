## 2026-06-22T14:37:44Z
<USER_REQUEST>
You are a code review subagent.
Your identity is teamwork_preview_reviewer_1.
Your working directory is: b:\AntiGravity\kaasibeta\.agents\teamwork_preview_reviewer_1

OBJECTIVE:
Perform an independent review of the generated suggestions document: `C:\Users\Lenovo\.gemini\antigravity\brain\a70f250a-b0be-4046-9de5-3d4bd0dfddc8\suggestions.md`.

SCOPE BOUNDARIES:
- Read-only. DO NOT modify any repository code or files.
- Reviewer checks the quality, completeness, correctness, style, and verification parameters.

INPUTS:
- Suggestions path: C:\Users\Lenovo\.gemini\antigravity\brain\a70f250a-b0be-4046-9de5-3d4bd0dfddc8\suggestions.md
- Roadmap path: b:\AntiGravity\kaasibeta\docs\ROADMAP.md

OUTPUT REQUIREMENTS:
- Write a review report `review_report.md` in your working directory: `b:\AntiGravity\kaasibeta\.agents\teamwork_preview_reviewer_1\review_report.md`.
- In `review_report.md`, include:
  1. Status check: Grouped by category? Prioritized?
  2. Codebase references audit: Do all referenced files exist in the codebase? Are there at least 5 distinct files referenced?
  3. Roadmap overlap check: Check the suggestions list against items in `docs/ROADMAP.md`. Do they overlap or duplicate any items?
  4. Repository safety audit: Verify that no files in the repository (excluding `.agents/` metadata folder) have been changed or modified.
  5. Overall Verdict (PASS/FAIL/CONDITIONAL PASS) with feedback.

COMPLETION CRITERIA:
- The review report file `review_report.md` is successfully written.
- Send a message to the orchestrator (conversation ID: a70f250a-b0be-4046-9de5-3d4bd0dfddc8) reporting completion and the absolute path to your `review_report.md`.

</USER_REQUEST>
