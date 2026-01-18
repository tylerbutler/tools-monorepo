# remark-workspace-packages

A [remark](https://github.com/remarkjs/remark) plugin that generates and updates markdown tables of packages in your monorepo workspace.

## Features

- Reads `pnpm-workspace.yaml` or `package.json` workspaces to discover packages
- Generates markdown tables with configurable columns (name, description, path, private)
- Supports glob patterns for include/exclude filtering
- Preserves user-edited descriptions across regenerations
- Links package names to their directories

## Installation

```bash
pnpm add remark-workspace-packages
```

## Usage

Add HTML comment markers to your markdown file where you want the table:

```markdown
<!-- workspace-packages-start -->
<!-- workspace-packages-end -->
```

Then process the file with remark:

```typescript
import { remark } from "remark";
import { remarkWorkspacePackages } from "remark-workspace-packages";

const result = await remark()
  .use(remarkWorkspacePackages)
  .process(markdown);
```

The plugin will generate a table between the markers:

```markdown
<!-- workspace-packages-start -->

| Package | Description |
| ------- | ----------- |
| [`my-lib`](./packages/my-lib) | A library |
| [`my-app`](./packages/my-app) | An application |

<!-- workspace-packages-end -->
```

### With remark-cli

Create a `.remarkrc.mjs` configuration file:

```javascript
import remarkGfm from "remark-gfm";
import { remarkWorkspacePackages } from "remark-workspace-packages";

export default {
  plugins: [
    remarkGfm,
    [remarkWorkspacePackages, {
      exclude: ["@internal/*"],
      columns: ["name", "description"],
    }],
  ],
};
```

Then run:

```bash
remark README.md --output
```

## Options

### `workspaceRoot`

- Type: `string`
- Default: auto-detected

Path to the workspace root relative to the markdown file's directory. If not specified, the plugin searches upward for `pnpm-workspace.yaml` or `package.json` with workspaces.

### `sectionPrefix`

- Type: `string`
- Default: `"workspace-packages"`

Prefix for section markers. Results in `<!-- {prefix}-start -->` and `<!-- {prefix}-end -->`.

### `exclude`

- Type: `string[]`
- Default: `[]`

Glob patterns to exclude packages from the table. Matches against package names.

```typescript
{ exclude: ["@internal/*", "*-private"] }
```

### `include`

- Type: `string[]`
- Default: `[]` (include all)

Glob patterns to include packages in the table. If specified, only matching packages are included.

```typescript
{ include: ["@myorg/*"] }
```

### `includePrivate`

- Type: `boolean`
- Default: `true`

Whether to include private packages in the table.

### `includeLinks`

- Type: `boolean`
- Default: `true`

Whether to include links to the package directories.

### `columns`

- Type: `("name" | "description" | "path" | "private")[]`
- Default: `["name", "description"]`

Columns to include in the table:

- `name` - Package name (with optional link)
- `description` - Package description from package.json
- `path` - Relative path to the package
- `private` - Shows ✓ for private packages

```typescript
{ columns: ["name", "private", "description"] }
```

### `columnHeaders`

- Type: `Partial<Record<ColumnType, string>>`
- Default: `{ name: "Package", description: "Description", path: "Path", private: "Private" }`

Custom column headers.

```typescript
{ columnHeaders: { name: "Name", description: "About" } }
```

## Preserving Descriptions

If you manually edit descriptions in the generated table, those edits are preserved when the table is regenerated. This allows you to provide richer descriptions than what's in `package.json`.

## License

MIT
