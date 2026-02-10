# initialClients Must Include the Connecting Client

## Behavior

The Fluid Framework expects that the `initialClients` array in the delta connection's connected response includes the connecting client itself. This is not documented in the `IDocumentDeltaConnection` interface or any public API documentation.

## Discovery

When connecting a single client to a Levee server, the presence system (`@fluidframework/presence`) threw an assertion failure:

```
assert at PresenceDatastoreManagerImpl.sendQueuedMessage (presenceDatastoreManager.ts:496:3)
```

This is assertion `0xcbb` ("Client connection update missing") or `0xa59` ("Client connected without clientId") in `@fluidframework/presence@2.81.1`.

The error occurred because:

1. The Levee server's `connect_document_success` response did not include the connecting client in `initialClients`
2. The Fluid Framework's `ConnectionManager` (in `@fluidframework/container-loader`) synthesizes `ClientJoin` signals from the `initialClients` array
3. These signals trigger `signalAudience.addMember()`, which populates the presence system's `clientToSessionId` mapping via `PresenceManager.onJoin()`
4. Without the self client in `initialClients`, the audience never learned about it
5. `PresenceManager.onJoin()` never fired for the self client (the constructor check `audience.getMember(clientId) !== undefined` failed)
6. When the presence timer fired `sendQueuedMessage()`, it asserted on `clientToSessionId[selfClientId] !== undefined`

In a multi-client scenario this might be masked if a signal from another client triggers the `onJoin` path, but for a single-client container there is no fallback.

## Fix

In `LeveeDeltaConnection.connect()`, after receiving the connected response, the driver checks whether the self client is present in `initialClients`. If not, it appends an entry with the self client's `clientId` and `clientInfo`.

**File:** `packages/levee-driver/src/leveeDeltaConnection.ts`

```typescript
const selfInClients = this.initialClients.some(
    (c) => c.clientId === this.clientId,
);
if (!selfInClients) {
    this.initialClients.push({
        clientId: this.clientId,
        client: this.clientInfo,
    });
}
```

## Relevant Fluid Framework Source

- **`ConnectionManager`** (`@fluidframework/container-loader`) -- iterates `initialClients` and emits synthetic `ClientJoin` signals
- **`PresenceManager`** (`@fluidframework/presence`) -- listens for audience member additions to populate `clientToSessionId`
- **`PresenceDatastoreManagerImpl.sendQueuedMessage`** (`@fluidframework/presence`) -- asserts that `clientToSessionId` has an entry for the self client before sending
