---
name: post-edit-conventions
description: Monorepo coding conventions to follow when writing or editing code in this repository
user-invocable: false
---

## Coding Conventions

Always follow these conventions when writing or editing code in this monorepo:

### Formatting
- **Tabs** for indentation (never spaces)
- Biome handles formatting — don't manually adjust style

### File Extensions
- **No `.js` files** — use `.mjs` or `.cjs` for JavaScript
- TypeScript files use `.ts` (ESM is default via `"type": "module"`)
- This is enforced by the `NoJsFileExtensions` repopo policy

### Imports
- **No barrel re-exports** — import directly from the source module, not through index files
- Use `pathe` instead of `node:path` for cross-platform path handling
- Use `fs/promises` (async) instead of `fs` sync methods (`readFile` not `readFileSync`)
- Use explicit file extensions in imports where required

### Dependencies
- Internal workspace deps use `workspace:^` protocol
- Never add runtime dependencies to `@tylerbu/fundamentals` (zero-dep package)
- Use `pnpm` exclusively (never npm or yarn)

### TypeScript
- Use proper types — avoid `any`
- Prefer `satisfies` over `as` for type assertions
- Don't add lint-disable comments to work around type issues
- All packages extend base tsconfig from `config/tsconfig.strict.json`

### Package Structure
- Output directory is `esm/` (not `dist/` or `lib/`)
- Source in `src/`, tests in `test/`
- Every package needs `"type": "module"` in package.json
- Package.json keys must be sorted (enforced by repopo)

### Testing
- Use Vitest (not Jest)
- Test files: `test/**/*.test.ts`
- Merge base config: `import defaultConfig from "../../config/vitest.config"`
