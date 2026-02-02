# Development Guide for @tylerbu/sorted-btree-es6

This package is a fork of [qwertie/btree-typescript](https://github.com/qwertie/btree-typescript) maintained as a git subrepo. The primary purpose of this fork is to output ES2020 JavaScript instead of ES5.

## Fork Overview

| Aspect | Upstream | This Fork |
|--------|----------|-----------|
| Package name | `sorted-btree` | `@tylerbu/sorted-btree-es6` |
| Target | ES5 | ES2020 |
| Module | CommonJS | Node16 (CommonJS output) |
| Minifier | uglify-js | terser |
| Extended functionality | Included | Excluded (ES2020 compatibility issues) |

## Changes from Upstream

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es2020",           // was: "es5"
    "module": "node16",           // was: "commonjs"
    "moduleResolution": "node16"  // was: "node"
  }
}
```

### package.json

- **name**: Changed to `@tylerbu/sorted-btree-es6`
- **type**: Added `"type": "commonjs"` for node16 module resolution
- **minify script**: Changed from `node scripts/minify.js` to `terser -cm -o b+tree.min.js -- b+tree.js`
- **files**: Removed `extended/*` entries (see [Extended Functionality](#extended-functionality))
- **devDependencies**: Updated to modern versions:
  - `jest`: ^29.7.0
  - `ts-jest`: ^29.1.1
  - `ts-node`: ^10.9.2
  - `typescript`: ^5.1.6
  - `@types/jest`: ^29.5.11 (added)
  - `@types/node`: ^20.10.0
  - `terser`: ^5.26.0 (replaces `uglify-js`)
- **jest config**:
  - Removed deprecated `globals.ts-jest` config
  - Changed `bail` to `true`
  - Removed `verbose`
  - Added exclusions for extended tests

### Extended Functionality

The `extended/` directory contains additional B+ tree algorithms (bulkLoad, diffAgainst, intersect, subtract, union, etc.). These are **excluded from this fork** because they have temporal dead zone (TDZ) bugs that surface when compiled to ES2020.

Specifically, `forEachKeyNotIn.ts` has a reference error:
```
ReferenceError: Cannot access 'cursorExclude' before initialization
```

This bug was hidden in ES5 due to `var` hoisting but is exposed by ES2020's `let`/`const` semantics.

If you need the extended functionality, you can either:
1. Fix the TDZ bugs in the upstream code
2. Use the original `sorted-btree` package for those features

## Pulling Upstream Changes

This package is managed via [git-subrepo](https://github.com/ingydotnet/git-subrepo). After pulling upstream changes, you must reapply the ES2020 transformations.

### Steps

```bash
# 1. Pull upstream changes
git subrepo pull packages/btree-typescript

# 2. Apply ES2020 transformations
node packages/btree-typescript/scripts/apply-es2020-transforms.js

# 3. Install updated dependencies
pnpm install

# 4. Verify tests pass
pnpm test --filter @tylerbu/sorted-btree-es6

# 5. Commit the changes
git add packages/btree-typescript
git commit -m "chore(btree): pull upstream and reapply ES2020 transforms"
```

### Transformation Script

The `scripts/apply-es2020-transforms.js` script automatically applies all necessary changes:

- Updates tsconfig.json (target, module, moduleResolution)
- Updates package.json:
  - Package name
  - Type field
  - Minify script (terser)
  - DevDependency versions
  - Jest configuration
  - Removes extended/* from files
  - Adds extended test exclusions

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch
```

The test suite includes 149 tests covering the core B+ tree functionality.

## Building

```bash
# Build (compile + minify)
pnpm build

# Just compile
npx tsc

# Just minify
pnpm minify
```

Output files:
- `b+tree.js` - Compiled ES2020 JavaScript
- `b+tree.d.ts` - TypeScript declarations
- `b+tree.min.js` - Minified version

## Publishing

This package is published to npm under the `@tylerbu` scope:

```bash
npm publish --access public
```

## Troubleshooting

### "Cannot find name 'expect'" errors during build

This means `@types/jest` is missing. Run:
```bash
pnpm install
```

### Type errors with @types/node

Ensure `@types/node` is at least `^20.10.0`. Older versions have incompatibilities with TypeScript 5.x.

### Tests fail in extended/ tests

The extended tests are excluded by default. If you see failures there, ensure `testPathIgnorePatterns` in package.json includes the extended test files.
