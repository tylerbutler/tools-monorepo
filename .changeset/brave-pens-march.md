---
"remark-workspace-packages": minor
---

Add remark-workspace-packages plugin for generating workspace package tables in markdown

Features:
- Reads pnpm-workspace.yaml to discover packages
- Generates markdown tables with configurable columns (name, description, version)
- Supports glob patterns in workspace definitions
- Preserves user-edited descriptions across runs
- Links package names to their directories
