# Project Plan - Codebase and Roadmap Suggestions

## Objectives
Coordinate the analysis of `kaasibeta` and produce a comprehensive suggestions document without modifying any codebase files.

## Detailed Steps

### Phase 1: Analysis & Exploration
- Spawn `teamwork_preview_explorer` (Explorer 1) to perform comprehensive codebase analysis and roadmap review.
- Explorer will:
  - Enumerate files in `b:\AntiGravity\kaasibeta`.
  - Read and analyze `docs/ROADMAP.md` to catalog all planned items.
  - Scan files for bugs, UI/UX elements, styling, and opportunities for features.
  - Select and inspect at least 5 key files in depth.
  - Produce an analysis report (`analysis_report.md` in `.agents/explorer_1/`).

### Phase 2: Synthesis and Draft Generation
- Based on Explorer's report, compile suggestions into categories: Bugs, UI/UX, New Features.
- Prioritize each suggestion by impact (High, Medium, Low).
- Include file references (at least 5 distinct codebase files).
- Write draft suggestions document `suggestions.md` in the brain artifacts directory.

### Phase 3: Automated & Independent Verification
- Write a Python verification script that reads `suggestions.md` and `docs/ROADMAP.md` to:
  - Verify that suggestions do not overlap with items in `docs/ROADMAP.md`.
  - Verify that at least 5 distinct files from the codebase are referenced in `suggestions.md`.
  - Verify categories are present and suggestions are prioritized.
- Execute the script and fix any failures.
- Spawn `teamwork_preview_reviewer` (Reviewer 1) to review the Suggestions document.
- Reviewer will check:
  - Coverage and depth of suggestions.
  - Style and presentation.
  - Absence of repository file modifications.

### Phase 4: Finalization & Handoff
- Correct any issues raised by the Reviewer.
- Write `handoff.md` in `.agents/orchestrator/`.
- Send completion message to parent agent.
