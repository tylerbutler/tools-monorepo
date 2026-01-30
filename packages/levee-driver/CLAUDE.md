# CLAUDE.md - @tylerbu/levee-driver

Package-specific guidance for the Levee Fluid Framework driver.

## Package Overview

Low-level Fluid Framework driver for connecting to Levee servers. This driver provides a drop-in replacement for Socket.IO-based drivers, using Phoenix Channels (Elixir/Phoenix) for real-time WebSocket communication.

**Status:** Private package (not published to npm)
**Framework:** Fluid Framework v2.33.x
**Purpose:** Personal projects using Fluid Framework with Phoenix/Elixir servers

See [DEV.md](DEV.md) for development workflows (e.g., updating protocol schema).

## Essential Commands

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test:vitest

# Run tests with coverage
pnpm test:coverage

# Format code
pnpm format

# Lint code
pnpm lint
pnpm lint:fix  # Auto-fix issues

# Clean build artifacts
pnpm clean
```

## Project Structure

```
packages/levee-driver/
├── src/
│   ├── index.ts                    # Main exports
│   ├── contracts.ts                # Types and interfaces
│   ├── tokenProvider.ts            # JWT token providers
│   ├── urlResolver.ts              # URL resolver
│   ├── restWrapper.ts              # HTTP client with auth
│   ├── gitManager.ts               # Git storage operations
│   ├── leveeDocumentServiceFactory.ts   # Factory (main entry)
│   ├── leveeDocumentService.ts          # Service implementation
│   ├── leveeDeltaConnection.ts          # WebSocket connection
│   ├── leveeStorageService.ts           # Storage service
│   └── leveeDeltaStorageService.ts
├── test/                           # Vitest tests
├── esm/                            # Compiled output
├── package.json
└── tsconfig.json
```

## Key Exports

### Document Service Factory

```typescript
import {
  LeveeDocumentServiceFactory,
  LeveeUrlResolver,
  InsecureLeveeTokenProvider,
} from "@tylerbu/levee-driver";

// Create token provider (for dev/test only)
const tokenProvider = new InsecureLeveeTokenProvider(
  "tenant-secret-key",
  { id: "user-123", name: "Test User" }
);

// Create URL resolver
const urlResolver = new LeveeUrlResolver(
  "ws://localhost:4000/socket",  // Phoenix WebSocket URL
  "http://localhost:4000"         // HTTP API URL
);

// Create document service factory
const serviceFactory = new LeveeDocumentServiceFactory(tokenProvider);
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

## Component Architecture

### LeveeDocumentServiceFactory
Main entry point for the driver. Creates `LeveeDocumentService` instances for documents.

### LeveeDocumentService
Coordinates the three core services:
- `LeveeStorageService` - Blob/snapshot operations
- `LeveeDeltaStorageService` - Historical delta fetching
- `LeveeDeltaConnection` - Real-time WebSocket connection

### LeveeDeltaConnection
Core real-time communication using Phoenix Channels:
- Handles bidirectional op/signal flow
- Manages connection lifecycle
- Provides early message buffering

### Token Providers

**InsecureLeveeTokenProvider** (dev/test only):
- Generates JWTs locally using shared secret
- Never use in production

**RemoteLeveeTokenProvider** (production):
- Fetches tokens from remote auth service
- Includes token caching with early expiration

## Event Mapping (Socket.IO → Phoenix Channels)

| Fluid Event | Socket.IO | Phoenix Channels |
|-------------|-----------|------------------|
| Connect doc | `socket.emit("connect_document")` | `channel.push("connect_document")` |
| Submit op | `socket.emit("submitOp")` | `channel.push("submitOp")` |
| Receive op | `socket.on("op")` | `channel.on("op")` |
| Submit signal | `socket.emit("submitSignal")` | `channel.push("submitSignal")` |
| Receive signal | `socket.on("signal")` | `channel.on("signal")` |
| Nack | `socket.on("nack")` | `channel.on("nack")` |
| Disconnect | `socket.on("disconnect")` | `channel.onClose()` |

## Testing

Tests use Vitest and focus on unit testing the components:

```bash
# Run all tests
pnpm test:vitest

# Run with coverage
pnpm test:coverage
```

Test files are in the `test/` directory.

## Important Constraints

1. **Private Package** - Not published to npm
2. **Fluid Framework Version** - Locked to v2.33.x
3. **TypeScript** - Strict mode enabled
4. **Phoenix Channels** - Requires Phoenix 1.7+ compatible server
5. **Biome Formatting** - Code must pass Biome checks

## Fluid Framework Resources

**Official Documentation:**
- https://fluidframework.com/docs/
- https://github.com/microsoft/FluidFramework

**Key Concepts:**
- Document services and factories
- Delta connections and storage
- Token providers and authentication

## Related Packages

### @tylerbu/levee-client

High-level client that wraps this driver. Use `levee-client` for a simplified `fluid-static`-style API. Use this driver directly only if you need:
- Custom container loading with the Fluid Loader API
- Direct access to document service factory
- Custom URL resolvers or token providers

### @tylerbu/levee-example

Example DiceRoller application using the driver directly with the Fluid Loader API.

### @tylerbu/levee-presence-tracker

Example presence tracking application using `levee-client` with Fluid Framework presence features.

## Future Considerations

- Add automatic reconnection with exponential backoff
- Add presence/heartbeat support
- Integration tests against running Levee server
- Support for Phoenix presence feature
