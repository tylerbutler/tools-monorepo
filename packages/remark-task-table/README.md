# remark-task-table

A [remark](https://github.com/remarkjs/remark) plugin to generate and update task tables from `package.json` scripts and [justfile](https://just.systems) recipes.

## Features

- Generates a markdown table from `package.json` scripts
- Optionally includes [justfile](https://just.systems) recipes
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
