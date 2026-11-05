# Kaasi Beta development

Read and follow [.agents/AGENTS.md](.agents/AGENTS.md) for the existing application rules, release workflow and financial-data constraints. Those rules remain authoritative; this file adds Graphify navigation guidance.

## Graphify navigation

- The code-and-document knowledge graph is in `graphify-out/graph.json`; its report and interactive HTML are beside it. It excludes images, private data, dependencies and the separate Android project.
- Use `tools/graphify.ps1 query "question" -Budget 800` for architecture, dependencies and cross-file exploration. Prefer a scoped graph query before broad file searches or loading large source files. Pass this guidance to subagents doing codebase exploration.
- For exact small lookups, a focused `rg` search is appropriate. Verify the current source before edits; graph relationships can be inferred or stale. Do not load the entire graph, report or installed skill for a small query.
- Disambiguate shared symbol names with `path::symbol`, for example `js/globals.js::saveData()`. Use `tools/graphify.ps1 path "A" "B"` or `explain "symbol"` when helpful.
- After product source-code changes, run `tools/graphify.ps1 update` once per completed change round. This updates AST data locally while retaining semantic document nodes. Re-analyze changed documents through the Graphify skill when needed; AST updates do not interpret revised prose.
- Keep `.graphifyignore` exclusions intact, especially recovery codes and private backups. The helper disables model backends and query logging for its commands. No cloud service, API key, watcher or hook is required.
- Commit only portable graph outputs with related changes. Leave ignored caches, interpreter paths and manifests local. A tooling-only update does not require an application version bump.
