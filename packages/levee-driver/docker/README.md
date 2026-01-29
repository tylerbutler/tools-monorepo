# Levee Server Docker Setup

This directory contains Docker configuration for running the Levee server locally for integration testing.

## Prerequisites

Clone the Levee server repository locally:

```bash
git clone git@github.com:tylerbutler/levee.git /path/to/levee
```

Set the `LEVEE_SOURCE_PATH` environment variable to point to your local checkout:

```bash
export LEVEE_SOURCE_PATH=/path/to/levee
```

## Quick Start

```bash
# From the levee-driver package directory
cd packages/levee-driver

# Set path to your local levee checkout
export LEVEE_SOURCE_PATH=/path/to/levee

# Start the Levee server
pnpm test:integration:up

# Run integration tests
pnpm test:integration

# View server logs
pnpm test:integration:logs

# Stop the server
pnpm test:integration:down
```

## Configuration

### Environment Variables

The following environment variables can be used to configure the tests:

| Variable | Default | Description |
|----------|---------|-------------|
| `LEVEE_SOURCE_PATH` | (required) | Path to local levee repo checkout |
| `LEVEE_HTTP_URL` | `http://localhost:4000` | HTTP API endpoint |
| `LEVEE_SOCKET_URL` | `ws://localhost:4000/socket` | WebSocket endpoint |
| `LEVEE_TENANT_KEY` | `dev-tenant-secret-key` | Tenant secret for token generation |

## Dockerfile Details

The `Dockerfile.levee-server` uses a multi-stage build:

1. **Builder stage**: Copies local Levee source and builds an Elixir release
2. **Runtime stage**: Minimal Alpine image with just the compiled release

This approach ensures:
- Builds from your local source (supports private repos)
- Small runtime image (~50MB)
- No build tools in production image

## Troubleshooting

### Server won't start

Check the logs:
```bash
docker compose logs levee
```

Common issues:
- `LEVEE_SOURCE_PATH` not set: Export the environment variable pointing to your levee checkout
- Port 4000 already in use: Stop other services or change the port in `docker-compose.yml`
- Build failures: Check that your levee checkout is on a valid branch

### Tests fail to connect

Ensure the server is healthy:
```bash
docker compose ps
curl http://localhost:4000/health
```

### Rebuild from scratch

```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```
