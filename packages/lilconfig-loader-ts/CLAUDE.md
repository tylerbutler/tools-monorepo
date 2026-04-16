# CLAUDE.md - @tylerbu/lilconfig-loader-ts

Package-specific guidance for the lilconfig TypeScript loader.

## Package Overview

A loader that enables loading TypeScript configuration files in lilconfig. This utility allows projects using lilconfig to support TypeScript config files (`.ts`, `.mts`, `.cts`) alongside standard JavaScript and JSON formats.

**Purpose:** Enable TypeScript config files in lilconfig-based applications
**Implementation:** Uses `jiti` for JIT TypeScript compilation
**Peer Dependency:** Requires `lilconfig` v3.1.3+

## Essential Commands

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Format code
pnpm format

# Lint code
pnpm lint
pnpm lint:fix  # Auto-fix issues

# Check formatting
pnpm check

# Generate API documentation
pnpm build:api

# Clean build artifacts
pnpm clean
```

## Usage

### Basic Usage

```typescript
import { lilconfig } from "lilconfig";
import { loaders } from "@tylerbu/lilconfig-loader-ts";

// Create config loader with TypeScript support
const explorer = lilconfig("myapp", {
  loaders: {
    ".ts": loaders.ts,
    ".mts": loaders.mts,
    ".cts": loaders.cts,
  },
});

// Now supports these config files:
// - myapp.config.ts
// - myapp.config.mts
// - myapp.config.cts
const result = await explorer.search();
```

### Integration Example

```typescript
import { lilconfig } from "lilconfig";
import { loaders } from "@tylerbu/lilconfig-loader-ts";

export async function loadConfig() {
  const explorer = lilconfig("myapp", {
    searchPlaces: [
      "package.json",
      ".myapprc",
      ".myapprc.json",
      ".myapprc.yaml",
      ".myapprc.yml",
      "myapp.config.js",
      "myapp.config.cjs",
      "myapp.config.mjs",
      "myapp.config.ts",  // TypeScript support!
    ],
    loaders: {
      ".ts": loaders.ts,
      ".mts": loaders.mts,
      ".cts": loaders.cts,
    },
  });

  return await explorer.search();
}
```

## How It Works

### Under the Hood

The loader uses `jiti` for just-in-time TypeScript compilation:

```typescript
import { createJiti } from "jiti";

// Creates a JIT loader that compiles TypeScript on-the-fly
const loader = (filepath: string) => {
  const jiti = createJiti(filepath, {
    interopDefault: true,  // Handle default exports
    moduleCache: false,    // Fresh compilation each time
  });
  return jiti(filepath);
};
```

**Key Features:**
- No build step required for config files
- Supports all TypeScript features
- Handles ES modules and CommonJS
- Automatic default export handling

### Supported Extensions

- `.ts` - TypeScript files
- `.mts` - TypeScript ES modules
- `.cts` - TypeScript CommonJS modules

## Project Structure

```
packages/lilconfig-loader-ts/
├── src/
│   └── index.ts           # Loader implementation
├── esm/                   # Compiled output
├── _temp/                 # API documentation
├── package.json
└── tsconfig.json
```

## Configuration File Examples

### TypeScript Config

```typescript
// myapp.config.ts
import type { MyAppConfig } from "myapp";

const config: MyAppConfig = {
  option1: "value1",
  option2: 42,
};

export default config;
```

### ES Module TypeScript

```typescript
// myapp.config.mts
export default {
  option1: "value1",
  option2: 42,
};
```

### CommonJS TypeScript

```typescript
// myapp.config.cts
module.exports = {
  option1: "value1",
  option2: 42,
};
```

## Used By

This package is used by:
- **@tylerbu/cli-api** - CLI configuration loading
- Any package using lilconfig that wants TypeScript config support

## Common Patterns

### Type-Safe Configuration

```typescript
// Define config type
export interface MyAppConfig {
  setting1: string;
  setting2: number;
  advanced?: {
    debug: boolean;
  };
}

// Use in config file (myapp.config.ts)
import type { MyAppConfig } from "./types";

const config: MyAppConfig = {
  setting1: "value",
  setting2: 42,
  advanced: {
    debug: true,
  },
};

export default config;
```

### Dynamic Configuration

```typescript
// myapp.config.ts
import { readFileSync } from "node:fs";
import { parse } from "yaml";

// Load additional data
const data = parse(readFileSync("./data.yaml", "utf-8"));

export default {
  setting1: data.value,
  setting2: process.env.MY_VAR ?? "default",
};
```

### Conditional Configuration

```typescript
// myapp.config.ts
const isDev = process.env.NODE_ENV === "development";

export default {
  debug: isDev,
  apiUrl: isDev
    ? "http://localhost:3000"
    : "https://api.example.com",
};
```

## Important Constraints

1. **Peer Dependency** - Requires lilconfig v3.1.3+
2. **JIT Compilation** - Uses jiti for runtime TypeScript compilation
3. **ES Modules** - Package is ES module only
4. **TypeScript Support** - Supports all TypeScript features
5. **Biome Formatting** - Code must pass Biome checks

## Dependencies

**Runtime:**
- `jiti` - Just-in-time TypeScript/ESM loader

**Peer Dependencies:**
- `lilconfig` v3.1.3+ - Configuration file loader

**Dev Dependencies:**
- Standard TypeScript tooling
- API Extractor for documentation

## Performance Considerations

### JIT Compilation Overhead

- TypeScript files compiled at runtime (not ahead of time)
- Adds small startup cost (typically <100ms)
- Compiled output not cached by default
- Consider using JavaScript config files in performance-critical scenarios

### Optimization Tips

1. **Keep configs simple** - Avoid heavy computations in config files
2. **Cache results** - Cache loaded config in your application
3. **Precompile for production** - Consider transpiling TS configs to JS

## Alternatives

### Transpile Manually

Instead of runtime compilation:

```bash
# Transpile TypeScript config to JavaScript
tsc myapp.config.ts --outDir .

# Use transpiled version
```

### Use JavaScript

For maximum performance, use JavaScript config files:

```javascript
// myapp.config.js
export default {
  setting1: "value",
  setting2: 42,
};
```

## Future Enhancements

- Add caching for compiled configs
- Support source maps for better error messages
- Add watch mode for config file changes
- Consider alternative loaders (esbuild-register, tsx)

## Related Packages

- **lilconfig** - Configuration file loader (peer dependency)
- **jiti** - JIT TypeScript compiler (runtime dependency)
- **@tylerbu/cli-api** - Consumer of this loader
