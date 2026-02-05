# E2E Playwright Tests Design

**Date:** 2026-01-30
**Status:** Approved

## Overview

End-to-end Playwright tests for levee-presence-tracker that verify the full stack works: Levee server, client connection, and presence synchronization between multiple users.

## Test Infrastructure

### Directory Structure

```
packages/levee-presence-tracker/
├── e2e/
│   ├── presence-tracker.spec.ts    # Main test file
│   ├── global-setup.ts             # Server health check/startup
│   ├── fixtures/
│   │   └── test-fixtures.ts        # Custom Playwright fixtures
│   └── support/
│       └── server-manager.ts       # Levee server lifecycle management
├── playwright.config.ts            # Playwright configuration
└── package.json                    # Add @playwright/test dependency
```

### Server Management (Hybrid Approach)

1. Check if Levee server is healthy via `http://localhost:4000/health`
2. If not running, start it via `docker compose up -d` from levee-client directory
3. Wait for health check to pass (30s timeout)
4. Leave server running after tests complete

## Test Scenarios

### Single-User Tests

1. **Connection flow** - App loads, status shows "connected", container ID in URL hash
2. **Focus tracking** - Blur/focus window updates UI overlay
3. **Mouse tracking** - Mouse movement renders position in UI
4. **Emoji reactions** - Picker opens, reaction displays and fades

### Multi-User Tests

1. **Second user joins** - Two browser contexts, both show 2 users
2. **Cursor sync** - Mouse in context A visible in context B
3. **Focus sync** - Blur context A reflected in context B
4. **Reaction broadcast** - Reaction in context A visible in context B

## Custom Fixtures

```typescript
// ensureLeveeServer - runs once, checks/starts server
// connectedPage - page already connected to new container
// secondUser - second browser context joining same container
```

## Test Utilities

- `waitForConnected(page)` - Poll until status shows "connected"
- `getContainerIdFromUrl(page)` - Extract container ID from URL hash
- `waitForPresenceCount(page, count)` - Wait for N users in focus panel

## Configuration

### playwright.config.ts

- testDir: `./e2e`
- timeout: 60s per test
- retries: 1 (for flaky network tests)
- webServer: starts `pnpm dev` on port 3000
- globalSetup: ensures Levee server running
- Single browser project (Chromium)

### package.json scripts

- `test:e2e` - Run all E2E tests
- `test:e2e:ui` - Run with Playwright UI
- `test:e2e:headed` - Run in headed mode

## Implementation Order

1. Add `@playwright/test` dependency and scripts to package.json
2. Create `playwright.config.ts`
3. Create `e2e/support/server-manager.ts`
4. Create `e2e/global-setup.ts`
5. Create `e2e/fixtures/test-fixtures.ts`
6. Create `e2e/presence-tracker.spec.ts` with all tests
