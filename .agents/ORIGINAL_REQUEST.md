# Original User Request

## Initial Request — 2026-06-22T20:00:41Z

# Teamwork Project Prompt — Draft

> Status: Launched.
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Analyze the `kaasibeta` codebase and its existing roadmap, then generate a comprehensive, finalized, and organized document detailing suggestions for improvements, bug fixes, new features (major and minor), and UI/UX enhancements.

Working directory: b:\AntiGravity\kaasibeta
Integrity mode: development

## Requirements

### R1. Codebase and Roadmap Analysis
Thoroughly analyze all files in the `kaasibeta` repository to understand the product. Read `docs/ROADMAP.md` to identify planned features and avoid duplicating these in the suggestions.

### R2. Comprehensive Suggestions Document
Create a highly detailed, well-organized markdown artifact. The document must be grouped by category (Bugs, UI/UX, New Features) and prioritized by impact. Do NOT write or modify any code; this is purely an analysis task.

## Acceptance Criteria

### Verification
- [ ] The generated document is grouped by category (Bugs, UI/UX, New Features) and prioritized by impact.
- [ ] The document references at least 5 specific files from the `kaasibeta` codebase to prove deep analysis.
- [ ] An automated script or independent review verifies that none of the suggestions overlap with items already listed in `docs/ROADMAP.md`.
- [ ] No code in the repository is modified during the execution of this task.
