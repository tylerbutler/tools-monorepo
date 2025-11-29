---
"remark-task-table": minor
---

Add remark-task-table plugin for generating task tables from package.json scripts, Nx targets, and justfile recipes

Features:
- Automatically detects Nx workspaces and uses `nx show project --json` for target extraction
- Hierarchical sorting: orchestration targets (nx:noop) appear before their dependencies
- Preserves user-edited descriptions across runs
- Supports glob patterns for excluding tasks
