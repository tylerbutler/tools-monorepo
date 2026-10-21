---
name: changeset
description: Create changesets for pending changes by analyzing git diff and commit history
---

## Changeset Authoring

Analyze changes and create appropriate changesets in `.changeset/`.

### Workflow

1. **Analyze changes** - Run `git diff main --stat` and `git log --oneline main..HEAD` to understand what changed
2. **Identify affected packages** - Determine which packages in `packages/` were modified
3. **Determine bump level**:
   - `major` - Breaking changes (API changes, removed exports, changed signatures)
   - `minor` - New features (added exports, new functionality)
   - `patch` - Bug fixes, refactoring, documentation
4. **Group related changes** - Create separate changesets for distinct changes (e.g., separate breaking changes from features)
5. **Write descriptions** - Include:
   - What changed and why
   - BREAKING CHANGE section for major bumps
   - Migration guidance if needed

### Changeset Format

```markdown
---
"package-name": major|minor|patch
---

Brief summary of the change.

BREAKING CHANGE: Description of what breaks and how to migrate.
```

### Guidelines

- One changeset per logical change (not per commit)
- Use descriptive filenames: `.changeset/<package>-<change>.md`
- Check existing changesets first: `ls .changeset/*.md`
- Packages in `ignore` list (dill-docs, repopo-docs) don't need changesets
