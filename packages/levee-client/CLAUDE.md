# CLAUDE.md - @tylerbu/levee-client

Package-specific guidance for the Levee Fluid Framework service client.

## Package Overview

High-level client library for interacting with Levee Fluid Framework servers. This package wraps `@tylerbu/levee-driver` to provide a simplified `fluid-static`-style API for working with Phoenix Channels-based Fluid servers.

**Status:** Private package (not published to npm)
**Framework:** Fluid Framework v2.33.x
**Purpose:** Personal projects using Fluid Framework with Levee (Phoenix/Elixir) servers

## Essential Commands

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Format code
pnpm format

# Lint code
pnpm lint
pnpm lint:fix  # Auto-fix issues

# Generate API documentation
pnpm build:api

# Clean build artifacts
pnpm clean
```

## Project Structure

```
packages/levee-client/
├── src/
│   ├── index.ts                    # Main exports
│   ├── client.ts                   # LeveeClient implementation
│   ├── audience.ts                 # Audience member utilities
│   └── interfaces.ts               # Type definitions
├── esm/                            # Compiled output
├── test/                           # Tests (Vitest)
├── package.json
└── tsconfig.json
```

## Key Exports

### LeveeClient

The main client class for connecting to Levee servers:

```typescript
import { LeveeClient } from "@tylerbu/levee-client";

const client = new LeveeClient({
  connection: {
    httpUrl: "http://localhost:4000",      // HTTP API URL
    socketUrl: "ws://localhost:4000/socket", // Phoenix WebSocket URL
    tenantKey: "dev-secret-key",           // For InsecureLeveeTokenProvider (dev only)
    user: {
      id: "user-123",
      name: "Test User",
    },
  },
});
```

### Container Operations

```typescript
import type { ContainerSchema } from "fluid-framework";
import { SharedMap } from "@fluidframework/map";

const containerSchema = {
  initialObjects: {
    myMap: SharedMap,
  },
} satisfies ContainerSchema;

// Create new container
const { container } = await client.createContainer(containerSchema, "2");
const containerId = await container.attach();

// Load existing container
const { container } = await client.getContainer(containerId, containerSchema, "2");
```

### Connection Configuration

```typescript
interface LeveeConnectionConfig {
  /** HTTP base URL for REST API (e.g., "http://localhost:4000") */
  readonly httpUrl: string;
  /** WebSocket URL for Phoenix socket (e.g., "ws://localhost:4000/socket") */
  readonly socketUrl: string;
  /** Tenant ID (defaults to "fluid") */
  readonly tenantId?: string;
  /** Tenant secret key for InsecureLeveeTokenProvider (dev only) */
  readonly tenantKey?: string;
  /** User information for token generation */
  readonly user: LeveeUser;
  /** Custom token provider (overrides tenantKey if provided) */
  readonly tokenProvider?: TokenProvider;
}
```

### Re-exports from levee-driver

The package re-exports useful types from `@tylerbu/levee-driver`:

```typescript
export type { LeveeUser, TokenProvider } from "@tylerbu/levee-client";
export { InsecureLeveeTokenProvider, RemoteLeveeTokenProvider } from "@tylerbu/levee-client";
```

## Architecture

LeveeClient wraps the lower-level `@tylerbu/levee-driver` components:

```
LeveeClient (this package)
    ├── LeveeUrlResolver (from levee-driver)
    ├── LeveeDocumentServiceFactory (from levee-driver)
    └── InsecureLeveeTokenProvider / RemoteLeveeTokenProvider (from levee-driver)
```

The client uses `fluid-static` patterns internally:
- `createDetachedContainer()` / `loadExistingContainer()` from fluid-static
- `createFluidContainer()` / `createServiceAudience()` for container wrapping

## Related Packages

### @tylerbu/levee-driver

The low-level driver that this package wraps. Use directly if you need:
- Custom container loading with the Fluid Loader API
- Direct access to document service factory
- Custom URL resolvers or token providers

### @tylerbu/levee-presence-tracker

Example application demonstrating Fluid Framework presence features with LeveeClient.

## Testing

Tests use Vitest:

```bash
# Run tests
pnpm test:vitest

# Run with coverage
pnpm test:coverage
```

Integration tests require a running Levee server (Phoenix/Elixir).

## Important Constraints

1. **Private Package** - Not published to npm
2. **Fluid Framework Version** - Locked to v2.33.x
3. **TypeScript** - Strict mode enabled
4. **Levee Server** - Requires running Phoenix/Elixir Levee server
5. **Biome Formatting** - Code must pass Biome checks

## Fluid Framework Resources

**Official Documentation:**
- https://fluidframework.com/docs/
- https://github.com/microsoft/FluidFramework

**Key Concepts:**
- DDSes (Distributed Data Structures)
- Container lifecycle
- fluid-static API patterns
