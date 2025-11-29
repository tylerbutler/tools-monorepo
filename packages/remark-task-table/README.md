# remark-task-table

A [remark](https://github.com/remarkjs/remark) plugin to generate and update task tables from `package.json` scripts, [Nx](https://nx.dev) targets, and [justfile](https://just.systems) recipes.

## Features

- Generates a markdown table from `package.json` scripts
- Automatically uses [Nx](https://nx.dev) targets when in an Nx workspace
- Optionally includes [justfile](https://just.systems) recipes
- Hierarchical sorting for Nx: orchestration targets appear before their dependencies
- Preserves user-edited descriptions on subsequent runs
- Auto-inserts table with markers if none exist
- Supports glob patterns for excluding scripts
- Sorts entries alphabetically

## Installation

```bash
npm install remark-task-table
# or
pnpm add remark-task-table
```

## Usage

### Basic Usage

Add markers to your README.md where you want the table:

```markdown
# My Project

## Tasks

<!-- task-table-start -->
<!-- task-table-end -->
```

Then process with remark:

```typescript
import { remark } from "remark";
import { remarkTaskTable } from "remark-task-table";

const result = await remark()
  .use(remarkTaskTable)
  .process(markdown);
```

If no markers exist, the table will be appended at the end of the file.

### Output

The plugin generates a table like this:

```markdown
<!-- task-table-start -->
| Task | Description |
| ---- | ----------- |
| `build` | tsc --project ./tsconfig.json |
| `test` | vitest run test |
| `lint` | biome lint . |
<!-- task-table-end -->
```

### Preserving Descriptions

When you edit the Description column, your changes are preserved on subsequent runs:

```markdown
<!-- task-table-start -->
| Task | Description |
| ---- | ----------- |
| `build` | Compiles TypeScript to JavaScript |
| `test` | Runs the test suite with coverage |
| `lint` | biome lint . |
<!-- task-table-end -->
```

If you re-run the plugin:
- Existing descriptions (like "Compiles TypeScript to JavaScript") are preserved
- New scripts get their command as the initial description
- Deleted scripts are removed from the table

## Options

```typescript
interface TaskTableOptions {
  /**
   * Path to package.json relative to the markdown file's directory.
   * @default "package.json"
   */
  packageJsonPath?: string;

  /**
   * Path to justfile relative to the markdown file's directory.
   * @default "justfile"
   */
  justfilePath?: string;

  /**
   * Whether to include package.json scripts.
   * @default true
   */
  includePackageJson?: boolean;

  /**
   * Whether to include justfile recipes.
   * @default true
   */
  includeJustfile?: boolean;

  /**
   * Whether to use Nx for task extraction when available.
   * When true and Nx is detected, replaces package.json scripts with Nx targets.
   * @default true
   */
  includeNx?: boolean;

  /**
   * The Nx project name. If not specified, inferred from package.json name.
   * Only used when Nx extraction is enabled.
   * @default undefined (auto-detect from package.json)
   */
  nxProject?: string;

  /**
   * Prefix for section markers.
   * Results in `<!-- {prefix}-start -->` and `<!-- {prefix}-end -->`
   * @default "task-table"
   */
  sectionPrefix?: string;

  /**
   * Glob patterns to exclude scripts/recipes from the table.
   * Matches against task names.
   * @default []
   */
  exclude?: string[];
}
```

### Examples

#### Exclude patterns

```typescript
// Exclude all scripts with colons (like build:watch, test:coverage)
.use(remarkTaskTable, { exclude: ["*:*"] })

// Exclude pre/post hooks
.use(remarkTaskTable, { exclude: ["pre*", "post*"] })

// Exclude specific scripts
.use(remarkTaskTable, { exclude: ["prepare", "postinstall"] })
```

#### Custom markers

```typescript
// Use <!-- scripts-start --> and <!-- scripts-end -->
.use(remarkTaskTable, { sectionPrefix: "scripts" })
```

#### Justfile only

```typescript
.use(remarkTaskTable, {
  includePackageJson: false,
  includeJustfile: true,
})
```

#### Disable Nx

```typescript
// Use package.json scripts even in an Nx workspace
.use(remarkTaskTable, { includeNx: false })
```

## Nx Support

When running in an [Nx](https://nx.dev) workspace, the plugin automatically uses `nx show project --json` to extract targets instead of reading `package.json` scripts directly.

**Detection:**
- The plugin looks for `nx.json` or `nx` in the root `package.json` devDependencies
- Searches upward from the markdown file's directory to find the workspace root

**Benefits:**
- Includes all Nx targets, not just package.json scripts
- Captures plugin-inferred targets (like those from `@nx/vite`)
- Uses `metadata.scriptContent` for accurate command descriptions

**Hierarchical Sorting:**
Orchestration targets (using `nx:noop` executor) are listed first, followed by their local dependencies. For example:

```markdown
| Task | Description |
| ---- | ----------- |
| `build` | Orchestrates build pipeline |
| `build:compile` | tsc --project ./tsconfig.json |
| `build:api` | api-extractor run |
| `test` | Orchestrates test pipeline |
| `test:vitest` | vitest run test |
```

**Custom Project Name:**
If the package name in `package.json` doesn't match the Nx project name, use the `nxProject` option:

```typescript
.use(remarkTaskTable, { nxProject: "my-nx-project-name" })
```

## Justfile Support

If a `justfile` exists in the same directory as the markdown file, recipes are extracted using `just --dump --dump-format json`.

**Requirements:**
- The `just` command must be installed and available in PATH
- If a justfile exists but `just` is not available, the plugin will emit an error

**Recipe descriptions:**
- If a recipe has a doc comment, it's used as the description
- Otherwise, the recipe body is used

## With Unified Pipeline

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import { remarkTaskTable } from "remark-task-table";
import remarkStringify from "remark-stringify";

const processor = unified()
  .use(remarkParse)
  .use(remarkTaskTable, { exclude: ["*:*"] })
  .use(remarkStringify);

const result = await processor.process(markdown);
```

## License

MIT
