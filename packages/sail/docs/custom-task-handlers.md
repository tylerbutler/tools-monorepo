# Custom Task Handler Plugins

Sail allows you to extend its capabilities by creating plugins that provide task handlers for tools not natively supported. **Plugins declare which executables they support**, so users don't need to manually map executables to handlers.

## Quick Start

### Creating a Plugin

```typescript
// vite-plugin.ts
import { LeafTask, type SailPlugin } from "@tylerbu/sail";

class ViteTask extends LeafTask {
	protected override async getInputFiles() {
		return this.globFiles(["src/**/*", "vite.config.ts"]);
	}
	protected override async getOutputFiles() {
		return this.globFiles(["dist/**/*"]);
	}
}

// Plugin declares which executables it handles
export default {
	handlers: {
		"vite": ViteTask,
		"vite build": ViteTask,
		"vite dev": ViteTask,
	}
} satisfies SailPlugin;
```

### Using a Plugin

```typescript
// sail.config.ts
export default {
	version: 1,
	plugins: [
		"@company/sail-vite-plugin"  // Just reference the plugin!
	]
};
```

That's it! No manual executable-to-handler mappings needed.

## Why Plugins?

**Before (manual mapping):**
```typescript
customHandlers: {
	"vite": { modulePath: "./ViteTask.js" },
	"vite build": { modulePath: "./ViteTask.js" },
	"vite dev": { modulePath: "./ViteTask.js" }
}
```

**After (plugin):**
```typescript
plugins: ["@company/sail-vite-plugin"]
```

The plugin itself declares which executables it handles!

## Plugin Interface

```typescript
export interface SailPlugin {
	/**
	 * Map of executable names to task handlers
	 */
	handlers: Record<string, TaskHandler>;

	/**
	 * Optional plugin name for debugging
	 */
	name?: string;
}
```

## Complete Example

```typescript
import {
	LeafTask,
	type SailPlugin,
	type BuildGraphPackage,
	type BuildContext,
} from "@tylerbu/sail";

class EsbuildTask extends LeafTask {
	constructor(
		node: BuildGraphPackage,
		command: string,
		context: BuildContext,
		taskName?: string,
	) {
		super(node, command, context, taskName);
	}

	protected override async getInputFiles(): Promise<string[]> {
		return this.globFiles([
			"src/**/*.{ts,js}",
			"esbuild.config.js",
			"package.json",
		]);
	}

	protected override async getOutputFiles(): Promise<string[]> {
		return this.globFiles(["dist/**/*"]);
	}
}

export default {
	name: "esbuild",
	handlers: {
		"esbuild": EsbuildTask,
	}
} satisfies SailPlugin;
```

## Plugin Configuration

### Simple (Package Name)

```typescript
plugins: ["@company/sail-vite-plugin"]
```

### Local File

```typescript
plugins: [
	{ module: "./plugins/vite.js" }
]
```

### Named Export

```typescript
plugins: [
	{ module: "./plugins.js", exportName: "vitePlugin" }
]
```

## Publishing a Plugin

**package.json:**
```json
{
	"name": "@company/sail-vite-plugin",
	"main": "dist/index.js",
	"types": "dist/index.d.ts",
	"peerDependencies": {
		"@tylerbu/sail": "^0.1.0"
	}
}
```

**Usage:**
```bash
pnpm add -D @company/sail-vite-plugin
```

```typescript
// sail.config.ts
{
	plugins: ["@company/sail-vite-plugin"]
}
```

## Advanced Features

### Multiple Handlers

```typescript
export default {
	handlers: {
		"vite": ViteTask,
		"vite build": ViteBuildTask,  // Different handler for build
		"vite dev": ViteDevTask,      // Different handler for dev
	}
} satisfies SailPlugin;
```

### Non-Deterministic Builds

```typescript
class NonDeterministicTask extends LeafTask {
	public override useHashes(): boolean {
		return false;  // Use timestamps only
	}
}
```

## Handler Resolution Priority

1. **Declarative Tasks** (highest priority)
2. **Plugin Handlers**
3. **Built-in Handlers** (tsc, biome, etc.)
4. **UnknownLeafTask** (fallback)

Plugins can override built-in handlers!

## Troubleshooting

**Plugin not loading?**
- Ensure it exports a `SailPlugin` object with `handlers` property
- Check module path is correct
- Use `satisfies SailPlugin` to catch type errors

**Handlers not being used?**
- Check executable name matches exactly
- Look for conflicting declarative tasks
- Verify plugin is in config's `plugins` array

## Best Practices

✅ Use `satisfies SailPlugin` for type safety
✅ One plugin per tool/family of tools
✅ Document supported executables in README
✅ Test incremental build behavior
✅ Keep dependencies minimal

