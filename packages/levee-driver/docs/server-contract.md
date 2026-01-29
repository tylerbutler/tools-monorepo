# Levee Server Contract

This document describes the expected API contract between the Levee driver and the Levee server. Use this as a reference when implementing or debugging server endpoints.

## HTTP Endpoints

### Health Check

```
GET /health
```

**Response:**
- Status: `200 OK` if server is healthy

---

### Document Management

#### Create Document

```
POST /documents/{tenantId}
Content-Type: application/json
Authorization: Bearer {jwt}

{
  "id": "optional-document-id"
}
```

**Response:**
```json
{
  "id": "generated-or-provided-document-id"
}
```

If `id` is not provided in the request, the server should generate one.

---

### Delta Storage

#### Fetch Deltas

```
GET /deltas/{tenantId}/{documentId}?from={sequenceNumber}&to={sequenceNumber}
Authorization: Bearer {jwt}
```

**Query Parameters:**
- `from` (required): Starting sequence number (exclusive)
- `to` (optional): Ending sequence number (inclusive)

**Response:**
```json
{
  "value": [
    {
      "sequenceNumber": 1,
      "minimumSequenceNumber": 0,
      "clientId": "client-uuid",
      "clientSequenceNumber": 1,
      "referenceSequenceNumber": 0,
      "type": "op",
      "timestamp": 1706547200000,
      "contents": { ... }
    }
  ]
}
```

---

### Git Storage API

The storage API follows a Git-like model for storing blobs, trees, and commits.

#### Get Blob

```
GET /repos/{tenantId}/git/blobs/{sha}
Authorization: Bearer {jwt}
```

**Response:**
```json
{
  "sha": "abc123...",
  "content": "base64-encoded-content",
  "encoding": "base64",
  "size": 1234,
  "url": "/repos/{tenantId}/git/blobs/abc123..."
}
```

#### Create Blob

```
POST /repos/{tenantId}/git/blobs
Content-Type: application/json
Authorization: Bearer {jwt}

{
  "content": "content-string",
  "encoding": "utf-8"  // or "base64"
}
```

**Response:**
```json
{
  "sha": "abc123...",
  "content": "content-string",
  "encoding": "utf-8",
  "size": 1234,
  "url": "/repos/{tenantId}/git/blobs/abc123..."
}
```

#### Get Tree

```
GET /repos/{tenantId}/git/trees/{sha}?recursive=1
Authorization: Bearer {jwt}
```

**Query Parameters:**
- `recursive` (optional): If "1", fetch tree entries recursively

**Response:**
```json
{
  "sha": "def456...",
  "tree": [
    {
      "path": "file.json",
      "mode": "100644",
      "type": "blob",
      "sha": "abc123...",
      "size": 1234,
      "url": "/repos/{tenantId}/git/blobs/abc123..."
    }
  ],
  "url": "/repos/{tenantId}/git/trees/def456..."
}
```

#### Create Tree

```
POST /repos/{tenantId}/git/trees
Content-Type: application/json
Authorization: Bearer {jwt}

{
  "tree": [
    {
      "path": "file.json",
      "mode": "100644",
      "type": "blob",
      "sha": "abc123..."
    }
  ],
  "base_tree": "optional-parent-tree-sha"
}
```

**Response:** Same format as Get Tree

#### Get Commit

```
GET /repos/{tenantId}/git/commits/{sha}
Authorization: Bearer {jwt}
```

**Response:**
```json
{
  "sha": "ghi789...",
  "url": "/repos/{tenantId}/git/commits/ghi789...",
  "message": "Commit message",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "date": "2024-01-29T12:00:00Z"
  },
  "committer": {
    "name": "Committer Name",
    "email": "committer@example.com",
    "date": "2024-01-29T12:00:00Z"
  },
  "tree": {
    "sha": "def456...",
    "url": "/repos/{tenantId}/git/trees/def456..."
  },
  "parents": [
    {
      "sha": "parent123...",
      "url": "/repos/{tenantId}/git/commits/parent123..."
    }
  ]
}
```

#### Create Commit

```
POST /repos/{tenantId}/git/commits
Content-Type: application/json
Authorization: Bearer {jwt}

{
  "message": "Commit message",
  "tree": "tree-sha",
  "parents": ["parent-sha"],
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "date": "2024-01-29T12:00:00Z"  // optional
  }
}
```

**Response:** Same format as Get Commit

#### Get Refs

```
GET /repos/{tenantId}/git/refs
Authorization: Bearer {jwt}
```

**Response:**
```json
[
  {
    "ref": "refs/heads/main",
    "object": {
      "sha": "ghi789...",
      "type": "commit",
      "url": "/repos/{tenantId}/git/commits/ghi789..."
    }
  }
]
```

#### Get Specific Ref

```
GET /repos/{tenantId}/git/refs/{ref}
Authorization: Bearer {jwt}
```

Example: `GET /repos/tenant/git/refs/heads/main`

**Response:** Same format as a single ref object

#### Update Ref

```
PATCH /repos/{tenantId}/git/refs/{ref}
Content-Type: application/json
Authorization: Bearer {jwt}

{
  "sha": "new-commit-sha",
  "force": false
}
```

**Response:** Same format as a single ref object

---

## Phoenix Channel Messages

The driver connects to a Phoenix WebSocket endpoint and communicates via channels.

### Connection

**WebSocket URL:** `ws://server:4000/socket`

**Socket Parameters:**
```json
{
  "token": "jwt-token"
}
```

### Channel Topic Format

```
document:{tenantId}:{documentId}
```

Example: `document:fluid:my-document-123`

### Channel Join Parameters

```json
{
  "token": "jwt-token"
}
```

---

### Messages

#### connect_document (client → server)

Sent after joining the channel to establish the document connection.

**Payload:**
```json
{
  "tenantId": "fluid",
  "id": "document-id",
  "token": "jwt-token",
  "client": {
    "mode": "write",
    "details": {
      "capabilities": {
        "interactive": true
      }
    },
    "permission": [],
    "user": {
      "id": "user-123"
    },
    "scopes": ["doc:read", "doc:write"]
  },
  "mode": "write",
  "versions": ["^0.4.0", "^0.3.0", "^0.2.0", "^0.1.0"]
}
```

**Response (ok):**
```json
{
  "clientId": "generated-client-uuid",
  "existing": false,
  "maxMessageSize": 16384,
  "parentBranch": null,
  "version": "0.1",
  "initialMessages": [],
  "initialSignals": [],
  "initialClients": [],
  "serviceConfiguration": {
    "blockSize": 65536,
    "maxMessageSize": 16384,
    "summary": {
      "idleTime": 5000,
      "maxOps": 1000,
      "maxAckWaitTime": 600000,
      "maxTime": 60000
    }
  },
  "claims": {
    "tenantId": "fluid",
    "documentId": "document-id",
    "scopes": ["doc:read", "doc:write"],
    "user": { "id": "user-123" },
    "iat": 1706547200,
    "exp": 1706550800,
    "ver": "1.0"
  },
  "mode": "write",
  "epoch": "optional-epoch-string",
  "supportedVersions": ["^0.4.0", "^0.3.0"]
}
```

**Note:** The driver normalizes snake_case responses to camelCase automatically.

---

#### submitOp (client → server)

Submit operations to the server.

**Payload:**
```json
{
  "clientId": "client-uuid",
  "messages": [
    {
      "type": "op",
      "contents": { ... },
      "clientSequenceNumber": 1,
      "referenceSequenceNumber": 0,
      "metadata": { },
      "compression": null
    }
  ]
}
```

---

#### op (server → client)

Broadcast of sequenced operations.

**Payload:**
```json
{
  "documentId": "document-id",
  "ops": [
    {
      "sequenceNumber": 1,
      "minimumSequenceNumber": 0,
      "clientId": "client-uuid",
      "clientSequenceNumber": 1,
      "referenceSequenceNumber": 0,
      "type": "op",
      "timestamp": 1706547200000,
      "contents": { ... }
    }
  ]
}
```

**Note:** The driver handles multiple payload formats:
- `{ documentId, ops: [...] }`
- `{ ops: [...] }` (documentId defaults to connected document)
- `[...]` (array of ops directly)

---

#### submitSignal (client → server)

Submit a signal to other clients.

**Payload:**
```json
{
  "clientId": "client-uuid",
  "content": "json-string-content",
  "targetClientId": "optional-target-client"
}
```

---

#### signal (server → client)

Broadcast of signals.

**Payload:**
```json
{
  "clientId": "sender-client-id",
  "content": "json-string-content"
}
```

Or array of signals:
```json
[
  { "clientId": "...", "content": "..." }
]
```

---

#### nack (server → client)

Negative acknowledgment for rejected operations.

**Payload:**
```json
{
  "operation": { ... },
  "sequenceNumber": 5,
  "content": {
    "code": 400,
    "type": "BadRequestError",
    "message": "Invalid operation",
    "retryAfter": 1000
  }
}
```

**Nack Types:**
- `ThrottlingError` - Rate limited, should retry after delay
- `InvalidScopeError` - Permission denied
- `BadRequestError` - Invalid request format
- `LimitExceededError` - Size or rate limit exceeded
- `InvalidOperation` - Semantically invalid operation

---

#### pong (server → client)

Response to keepalive ping.

**Payload:**
```json
{
  "latency": 50
}
```

---

## Authentication

All requests require a JWT token in the `Authorization` header (HTTP) or socket/channel params (WebSocket).

### JWT Claims

```json
{
  "tenantId": "fluid",
  "documentId": "document-id",
  "scopes": ["doc:read", "doc:write"],
  "user": {
    "id": "user-123",
    "name": "User Name",
    "email": "user@example.com"
  },
  "iat": 1706547200,
  "exp": 1706550800,
  "ver": "1.0",
  "jti": "unique-token-id"
}
```

### Scopes

- `doc:read` - Read operations and signals
- `doc:write` - Write operations
- `doc:summarize` - Create summaries

---

## Debug Mode

Set `LEVEE_DEBUG=true` environment variable to enable debug logging in the driver. This will log:

- All HTTP requests and responses
- Phoenix channel join/leave events
- `connect_document` request/response (both raw and normalized)
- Incoming op/signal events
- Submitted operations

This is useful for identifying mismatches between driver expectations and server behavior.
