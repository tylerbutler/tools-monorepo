---
name: scaffold-package
description: Scaffold a new package in the monorepo with correct conventions, configs, and policy compliance
disable-model-invocation: true
---

## Scaffold a New Package

Create a new package in `packages/` following all monorepo conventions.

### Workflow

1. **Gather info** - Ask the user for:
   - Package name (with or without `@tylerbu/` scope)
   - Package type: `library`, `cli` (OCLIF), `docs` (Astro/Starlight), or `remark-plugin`
   - Brief description
   - Whether it should be private (default: false, except docs sites which are always private)

2. **Create directory** - `packages/<folder-name>/`
   - Folder name should match the unscoped package name

3. **Create package.json** matching existing conventions:
   - `"type": "module"`
   - `"license": "MIT"`
   - `"author": "Tyler Butler <tyler@tylerbutler.com>"`
   - `"bugs": "https://github.com/tylerbutler/tools-monorepo/issues"`
   - `"repository": { "type": "git", "url": "git+https://github.com/tylerbutler/tools-monorepo.git", "directory": "packages/<name>" }`
   - `"homepage"` pointing to GitHub tree
   - Exports using `./esm/` output directory with types
   - Scripts: `clean`, `build:compile`, `format`, `check:format`, `lint`, `test` as appropriate for the type
   - `"nx": { "targets": { "build": {} } }` to enable Nx orchestration
   - For CLIs: add `bin`, `oclif` config, `build:manifest`, `build:readme` scripts
   - For docs sites: add `"private": true`, `build:site`, `dev`, `preview` scripts, `check:astro`

4. **Create tsconfig.json**:
   ```json
   {
     "extends": "../../config/tsconfig.strict.json",
     "include": ["src/**/*"],
     "compilerOptions": {
       "rootDir": "./src",
       "outDir": "./esm",
       "types": ["node"]
     }
   }
   ```

5. **Create vitest.config.ts** (for non-docs packages):
   ```typescript
   import { defineConfig, mergeConfig } from "vitest/config";
   import defaultConfig from "../../config/vitest.config";
   const config = mergeConfig(defaultConfig, defineConfig({}));
   export default config;
   ```

6. **Create src/index.ts** with a placeholder export

7. **Create CLAUDE.md** with package-specific guidance (keep it concise - 20-30 lines)

8. **Run setup commands**:
   ```bash
   pnpm install
   ./packages/repopo/bin/dev.js check --fix
   pnpm syncpack:fix
   ```

9. **Verify** - Run `pnpm nx run <package>:build` to confirm the package builds

### Key Constraints
- Use tabs for indentation (not spaces)
- Use `.mts` for TypeScript files if they need to be explicitly ESM (though `.ts` is fine with `"type": "module"`)
- No `.js` file extensions - use `.mjs` or `.cjs`
- Sort package.json keys (repopo enforces this)
- Internal deps use `workspace:^` protocol
