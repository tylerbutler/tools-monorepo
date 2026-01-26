# CLAUDE.md - @tylerbu/levee-client

Package-specific guidance for the Levee Fluid Framework service client.

## Package Overview

Client library for interacting with the Levee Fluid Framework service. This package provides:

1. **LeveeClient** - High-level client for Tinylicious-compatible servers
2. **Phoenix Driver** - Low-level driver for Phoenix Channel-based Levee servers

The Phoenix driver enables Fluid Framework applications to connect to servers using Phoenix Channels (Elixir/Phoenix) instead of Socket.IO for real-time WebSocket communication.

**Status:** Private package (not published to npm)
**Framework:** Fluid Framework v2.33.x
**Purpose:** Personal projects using Fluid Framework

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

# Run tests (Mocha)
pnpm test:mocha

# Format code
pnpm format

# Lint code
pnpm lint
pnpm lint:fix  # Auto-fix issues

# Generate API documentation
pnpm build:api

# Clean build artifacts
pnpm clean

# Start local Tinylicious server
pnpm start

# Stop local Tinylicious server
pnpm stop
```

## Fluid Framework Basics

### What is Fluid Framework?

Fluid Framework is a collection of client libraries for building distributed, real-time collaborative applications. Key concepts:

- **Container** - The top-level object that holds shared data
- **DDSes** (Distributed Data Structures) - Shared data structures like maps, strings, sequences
- **Service** - The backend service that synchronizes data (Tinylicious for local dev, Azure Fluid Relay for production)

### Levee Service

Levee is a custom Fluid Framework service configuration. This client package provides connection utilities and type definitions for working with Levee-hosted containers.

## Project Structure

```
packages/levee-client/
├── src/
│   ├── index.ts                    # Main exports
│   ├── client.ts                   # LeveeClient (Tinylicious-compatible)
│   ├── audience.ts                 # Audience member utilities
│   ├── interfaces.ts               # Type definitions
│   └── phoenix/                    # Phoenix Channel driver
│       ├── index.ts                # Phoenix driver exports
│       ├── contracts.ts            # Types and interfaces
│       ├── tokenProvider.ts        # JWT token providers
│       ├── urlResolver.ts          # URL resolver for Phoenix server
│       ├── restWrapper.ts          # HTTP client with auth
│       ├── gitManager.ts           # Git storage operations
│       ├── phoenixDocumentServiceFactory.ts
│       ├── phoenixDocumentService.ts
│       ├── phoenixDocumentDeltaConnection.ts
│       ├── phoenixDocumentStorageService.ts
│       └── phoenixDocumentDeltaStorageService.ts
├── lib/                            # Compiled output
├── test/                           # Tests (Vitest)
├── package.json
└── tsconfig.json
```

## Key Exports

### Client Connection

```typescript
import { createLeveeClient } from "@tylerbu/levee-client";

// Create Fluid client connected to Levee service
const client = createLeveeClient({
  serviceUrl: "https://levee.example.com",
  userId: "user123",
  userName: "User Name"
});
```

### Container Operations

```typescript
import { getContainer, createContainer } from "@tylerbu/levee-client";

// Get existing container
const container = await getContainer(client, containerId);

// Create new container
const { container, services } = await createContainer(client, containerSchema);
```

### Shared Objects

```typescript
import { SharedMap } from "@fluidframework/map";

// Access shared data structures from container
const myMap = await container.getSharedObject<SharedMap>("myMapId");

// Listen to changes
myMap.on("valueChanged", (changed, local) => {
  console.log(`Value changed: ${changed.key}`);
});

// Set values
myMap.set("key", "value");
```

## Phoenix Driver Usage

The Phoenix driver enables connecting to Phoenix Channel-based Levee servers.

### Basic Setup

```typescript
import {
  PhoenixDocumentServiceFactory,
  PhoenixUrlResolver,
  InsecurePhoenixTokenProvider,
} from "@tylerbu/levee-client/phoenix";

// Create token provider (for dev/test only)
const tokenProvider = new InsecurePhoenixTokenProvider(
  "tenant-secret-key",
  { id: "user-123", name: "Test User" }
);

// Create URL resolver
const urlResolver = new PhoenixUrlResolver(
  "ws://localhost:4000/socket",  // Phoenix WebSocket URL
  "http://localhost:4000"         // HTTP API URL
);

// Create document service factory
const serviceFactory = new PhoenixDocumentServiceFactory(tokenProvider);
```

### Using with Fluid Container Loader

```typescript
import { Loader } from "@fluidframework/container-loader";

const loader = new Loader({
  urlResolver,
  documentServiceFactory: serviceFactory,
  codeLoader,
  logger,
});

// Load existing container
const container = await loader.resolve({ url: "fluid/my-document-id" });

// Create new container
const container = await loader.createDetachedContainer(codeDetails);
await container.attach(createNewRequest);
```

### Event Mapping (Socket.IO → Phoenix Channels)

| Fluid Event | Socket.IO | Phoenix Channels |
|-------------|-----------|------------------|
| Connect doc | `socket.emit("connect_document")` | `channel.push("connect_document")` |
| Submit op | `socket.emit("submitOp")` | `channel.push("submitOp")` |
| Receive op | `socket.on("op")` | `channel.on("op")` |
| Submit signal | `socket.emit("submitSignal")` | `channel.push("submitSignal")` |
| Receive signal | `socket.on("signal")` | `channel.on("signal")` |
| Nack | `socket.on("nack")` | `channel.on("nack")` |
| Disconnect | `socket.on("disconnect")` | `channel.onClose()` |

## Testing Strategy

### Local Testing with Tinylicious

Tinylicious is a local Fluid service for development:

```bash
# Start Tinylicious server
pnpm start

# Server runs on http://localhost:7070

# Run tests against local server
pnpm test

# Stop server
pnpm stop
```

### Unit Tests

Two test frameworks supported:

**Vitest:**
```bash
pnpm test:vitest
```

**Mocha:**
```bash
pnpm test:mocha
```

### Test Structure

- Unit tests in `test/` directory
- Integration tests require running Tinylicious
- Use `@fluidframework/test-utils` for test helpers

## Fluid Framework Dependencies

**Core Packages:**
- `@fluidframework/container-loader` - Container loading
- `@fluidframework/fluid-static` - Simplified API
- `@fluidframework/map` - SharedMap DDS
- `@fluidframework/routerlicious-driver` - Azure driver
- `@fluidframework/tinylicious-driver` - Local dev driver

**Phoenix Driver Dependencies:**
- `phoenix` - Phoenix JavaScript client for WebSocket channels
- `jsonwebtoken` - JWT token generation for authentication
- `uuid` - UUID generation for token JTI claims

**Version Pinning:**
All Fluid Framework packages are pinned to `~2.33.2` for consistency.

## Development Workflow

### Connecting to Local Service

```typescript
import { TinyliciousClient } from "@fluidframework/tinylicious-client";

// For local development
const client = new TinyliciousClient();
```

### Connecting to Production Service

```typescript
import { AzureClient } from "@fluidframework/azure-client";

// For production (Azure Fluid Relay)
const client = new AzureClient({
  connection: {
    type: "remote",
    tenantId: "...",
    tokenProvider: ...
  }
});
```

## Common Patterns

### Creating a Container Schema

```typescript
import { ContainerSchema } from "@fluidframework/fluid-static";
import { SharedMap } from "@fluidframework/map";

const containerSchema: ContainerSchema = {
  initialObjects: {
    myMap: SharedMap,
  },
};

const { container } = await client.createContainer(containerSchema);
```

### Working with Shared Maps

```typescript
const map = container.initialObjects.myMap;

// Set values
map.set("counter", 0);

// Get values
const value = map.get("counter");

// Listen to changes
map.on("valueChanged", (changed) => {
  console.log(`Key: ${changed.key}, Value: ${map.get(changed.key)}`);
});

// Increment (collaborative counter example)
map.set("counter", (map.get("counter") || 0) + 1);
```

### Handling Container Events

```typescript
// Connection state changes
container.on("connected", () => {
  console.log("Connected to service");
});

container.on("disconnected", () => {
  console.log("Disconnected from service");
});

// Errors
container.on("closed", (error) => {
  console.error("Container closed", error);
});
```

## Important Constraints

1. **Private Package** - Not published to npm
2. **Fluid Framework Version** - Locked to v2.33.x
3. **TypeScript** - Strict mode enabled
4. **Local Development** - Requires Tinylicious server
5. **Biome Formatting** - Code must pass Biome checks
6. **Test Coverage** - Both Vitest and Mocha supported

## Fluid Framework Resources

**Official Documentation:**
- https://fluidframework.com/docs/
- https://github.com/microsoft/FluidFramework

**Key Concepts:**
- DDSes (Distributed Data Structures)
- Container lifecycle
- Service connection patterns
- Collaboration patterns

## Troubleshooting

### Connection Issues

```bash
# Verify Tinylicious is running
curl http://localhost:7070

# Check logs
pnpm start  # View server logs
```

### Version Conflicts

Fluid Framework requires all packages at the same version:

```bash
# Check for version mismatches
pnpm list | grep @fluidframework

# Update all Fluid packages together
pnpm update @fluidframework/*
```

### Type Errors

Ensure all `@fluidframework` packages are at compatible versions. The framework uses strict version alignment.

## Future Considerations

- Consider upgrading to latest Fluid Framework version
- Evaluate Azure Fluid Relay for production
- Add more DDS examples (SharedString, SharedTree)
- Improve error handling and reconnection logic
- Add telemetry and monitoring
- Phoenix driver: Add automatic reconnection with exponential backoff
- Phoenix driver: Add presence/heartbeat support
- Phoenix driver: Integration tests against running Levee server
