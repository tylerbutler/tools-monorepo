# remark-repopo-policies

A [remark](https://github.com/remarkjs/remark) plugin that generates documentation tables for [repopo](https://github.com/tylerbutler/tools-monorepo/tree/main/packages/repopo) repository policies.

## Installation

```bash
npm install remark-repopo-policies
```

## Usage

```typescript
import { remark } from "remark";
import { remarkRepopoPolicies } from "remark-repopo-policies";

const result = await remark()
  .use(remarkRepopoPolicies, {
    configPath: "repopo.config.ts",
  })
  .process(markdown);
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `configPath` | `string` | `"repopo.config.ts"` | Path to repopo config file relative to markdown file |
| `sectionPrefix` | `string` | `"repopo-policies"` | Prefix for HTML markers |
| `showConfig` | `boolean` | `false` | Show policy configuration details |
| `showFilePattern` | `boolean` | `true` | Show file match patterns |

## Markers

The plugin looks for HTML comment markers in your markdown:

```markdown
<!-- repopo-policies-start -->
(table will be generated here)
<!-- repopo-policies-end -->
```

If no markers exist, the table is appended at the end of the file.

## Generated Table

The plugin generates a table with the following columns:

| Policy | Description | Auto-Fix | Files |
|--------|-------------|----------|-------|
| NoJsFileExtensions | Prevents ambiguous .js files | No | `*.js` |

User-edited descriptions are preserved across regenerations.

## License

MIT
