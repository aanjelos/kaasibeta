# Project Context

## Target Environment
- Workspace: b:\AntiGravity\kaasibeta
- OS: Windows
- Integrity Mode: development (read-only, do not modify repository code)

## Objectives
- Analyze kaasibeta codebase (all files) to understand the product.
- Read docs/ROADMAP.md to identify planned features (must not duplicate them).
- Generate a comprehensive suggestions document for:
  - Bugs
  - UI/UX
  - New Features (major & minor)
- Prioritize suggestions by impact.
- Reference at least 5 specific files from the kaasibeta codebase.
- Verify suggestions do not overlap with docs/ROADMAP.md using an automated script or independent review.
- Write Suggestions document to a markdown artifact (e.g. suggestions.md or in the brain directory, wait! Let's check where the suggestions document should go. R2 says "Create a highly detailed, well-organized markdown artifact." Is there a specific output path? Wait, usually user-facing artifacts go into the brain directory, e.g. `C:\Users\Lenovo\.gemini\antigravity\brain\<conv_id>\` or as returned by the tool. Wait, let's write the Suggestions document to `b:\AntiGravity\kaasibeta\codebase_roadmap_suggestions.md`? Let's check if the prompt specifies a path: "generation of the codebase/roadmap suggestions document as requested in the user prompt... Create your planning and progress files... in your working directory. When finished, write your handoff report to handoff.md in your working directory and notify me."
Wait, if it's an artifact, let's make it a user-facing artifact in the brain folder or at the root of the workspace if the user requested it. But since it's a read-only task, and no code in the repository should be modified, is the root of the workspace okay? Wait! "no code in the repository should be modified." Adding a new markdown suggestions document at the root of the repo isn't modifying code, but maybe we should keep it in the brain folder or `b:\AntiGravity\kaasibeta\.agents\orchestrator\suggestions.md` or similar? Let's read R2 again: "Create a highly detailed, well-organized markdown artifact." An artifact is usually created using `write_to_file` with `ArtifactMetadata`! When we write it to the brain folder, it's saved as an artifact. Let's see: `write_to_file` with `ArtifactMetadata` requires the file to be under `C:\Users\Lenovo\.gemini\antigravity\brain\a70f250a-b0be-4046-9de5-3d4bd0dfddc8/`.
Ah! Let's look at the error message we got earlier: "artifacts must be in C:\Users\Lenovo\.gemini\antigravity\brain\a70f250a-b0be-4046-9de5-3d4bd0dfddc8/".
So any user-facing artifact (like `suggestions.md`) should be created in `C:\Users\Lenovo\.gemini\antigravity\brain\a70f250a-b0be-4046-9de5-3d4bd0dfddc8/suggestions.md` and have `UserFacing: true`.
Yes, that fits perfectly! Let's document this path in `context.md`.
