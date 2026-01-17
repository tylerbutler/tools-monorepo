---
"@tylerbu/cli": minor
---

feat: add generate:commit-config command

Adds a new command that generates git-cliff and commitlint configuration files from a `commit-types.ccl` source file. This enables a single source of truth for commit type definitions.

**Usage:**
```bash
tbu generate commit-config              # Generate in current directory
tbu generate commit-config --dry-run    # Preview without writing
tbu generate commit-config --cwd ../foo # Generate in another directory
```

**Generated files:**
- `cliff.toml` - git-cliff changelog configuration
- `.commitlintrc.json` or `commitlint.config.cjs` - commitlint configuration (format depends on scope config)
