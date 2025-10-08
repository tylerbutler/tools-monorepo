# Turborepo Package Scripts Pattern

## TL;DR - Solution Implemented

All packages now have `"b": "turbo build"` script as a convenience wrapper.

**Usage**:
```bash
cd packages/cli
pnpm b          # Builds cli + all dependencies (automatic scoping)
# OR
turbo build     # Same thing, slightly shorter
```

This preserves fluid-build's "smart dependency building" while avoiding recursion issues with `"build": "turbo build"`.

## Background: The Recursion Problem

From Turborepo docs: **"Writing `turbo` commands into the `package.json` of packages can lead to recursively calling `turbo`."**

Why `"build": "turbo build"` causes recursion:

### Pattern 1: Packages with Complex Build Pipeline (most packages)

**Example**: `@tylerbu/lilconfig-loader-ts`, `@tylerbu/fundamentals`

These packages have turbo tasks orchestrated in `turbo.json`:
- `build` task depends on: `compile`, `api`, `docs`, etc.
- **NO `build` script in package.json**
- Individual atomic scripts remain: `compile`, `api`, `docs`

**Usage**:
```bash
# From package directory (automatic scoping):
cd packages/lilconfig-loader-ts
turbo build  # Builds this package + dependencies

# From root with filter:
turbo build --filter=@tylerbu/lilconfig-loader-ts

# Atomic tasks directly:
pnpm compile  # Just compile, no deps
```

### Pattern 2: Packages with Simple Builds (rare)

**Example**: Packages that just need TypeScript compilation

If a package has NO complex build pipeline (no api extraction, no docs generation):
- Can have `"build": "tsc"` or similar atomic command
- turbo.json `build` task runs this script
- No recursion because script doesn't call turbo

### Pattern 3: OCLIF CLI Packages (special case)

**Example**: `@tylerbu/cli`, `dill`, `repopo`, `sort-tsconfig`

These have `"build": "turbo build"` **BUT** they work because:
- User expectation: `pnpm build` should build the CLI
- The `build` script in package calls `turbo build`
- turbo.json handles orchestration without infinite loop
- **TODO**: Verify this doesn't cause recursion in practice

## Root package.json

All coordinating commands stay in root:
```json
{
  "scripts": {
    "build": "turbo run build",
    "compile": "turbo run compile",
    "test": "turbo run test",
    "lint": "turbo run lint"
  }
}
```

## Migration Status

- ✅ `@tylerbu/lilconfig-loader-ts` - NO build script (Pattern 1)
- ⚠️ OCLIF packages - Have `"build": "turbo build"` - need verification
- ✅ Root scripts - All use `turbo run <task>`

## Recommendations

1. **Simple packages**: Remove `build` script, let turbo orchestrate
2. **From package dir**: Use `turbo build` directly (automatic scoping)
3. **From root**: Use `turbo build --filter=<package>`
4. **Atomic tasks**: Keep in package.json (`compile`, `lint`, `test`)
5. **Never**: Put `turbo` commands in package scripts (except root)
