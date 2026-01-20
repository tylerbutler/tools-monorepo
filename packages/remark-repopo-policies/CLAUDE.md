# CLAUDE.md - remark-repopo-policies

Package-specific guidance for the repopo policies remark plugin.

## Package Overview

Remark plugin that generates documentation tables for repopo repository policies. Reads the `repopo.config.ts` file and outputs a markdown table showing each active policy, its description, auto-fix capability, and file match pattern.

## Core Architecture

### Plugin Flow

1. Resolve config file path relative to markdown file
2. Dynamically import the repopo config (TypeScript/ESM)
3. Extract policy instances from `config.policies` array
4. Parse existing table (if markers present) to preserve descriptions
5. Generate new table AST with policy information
6. Update markdown AST (replace between markers or append)

### Key Types

```typescript
interface PolicyInfo {
  name: string;          // Policy name from PolicyDefinition
  description: string;   // From policy or user-edited
  hasAutoFix: boolean;   // true if resolver is defined
  filePattern: string;   // RegExp.source from match
  configSummary?: string; // Brief config summary
}
```

### Options

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `configPath` | `string` | `"repopo.config.ts"` | Config file location |
| `sectionPrefix` | `string` | `"repopo-policies"` | HTML marker prefix |
| `showConfig` | `boolean` | `false` | Show config column |
| `showFilePattern` | `boolean` | `true` | Show files column |

## Development Commands

```bash
# Run tests
pnpm test

# Run specific test
pnpm vitest run test/index.test.ts

# Build
pnpm build:compile

# Format
pnpm format
```

## Testing Strategy

- **Unit tests**: Mock config files in temp directories (currently fail due to TS dynamic import limitation)
- **Integration tests**: Use actual monorepo `repopo.config.ts` (these pass)
- **Description preservation**: Verify user edits survive regeneration

## Key Dependencies

- `unified` / `vfile` - Remark plugin infrastructure
- `mdast-util-to-string` - Extract text from AST nodes
- `pathe` - Cross-platform path handling
- `repopo` - Peer dependency for types

## Common Patterns

### Dynamic Config Import

```typescript
const configUrl = pathToFileURL(configPath).href;
const configModule = await import(configUrl);
const config = configModule.default;
```

### HTML Marker Detection

```typescript
function findMarkers(tree: Root, prefix: string) {
  const startMarker = `<!-- ${prefix}-start -->`;
  const endMarker = `<!-- ${prefix}-end -->`;
  // Find indices in tree.children...
}
```

### Description Preservation

Parse existing table before generating new one:
```typescript
const existingDescriptions = parseExistingTable(tree, startIndex, endIndex);
// Use existingDescriptions.get(policyName) || policy.description
```