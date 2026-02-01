---
"@tylerbu/cli": minor
---

Add `pr collect` and `pr report` commands for GitHub PR metrics

- `pr collect <repo>` fetches PR metadata, reviews, and comments via GraphQL API to JSON Lines files
- `pr report` generates contributor metrics reports using DuckDB queries
