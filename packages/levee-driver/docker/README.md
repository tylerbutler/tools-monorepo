# Levee Server Docker Setup

This directory contains Docker configuration for running the Levee server locally for integration testing.

## Quick Start

```bash
# From the levee-driver package directory
cd packages/levee-driver

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
| `LEVEE_HTTP_URL` | `http://localhost:4000` | HTTP API endpoint |
| `LEVEE_SOCKET_URL` | `ws://localhost:4000/socket` | WebSocket endpoint |
| `LEVEE_TENANT_KEY` | `dev-tenant-secret-key` | Tenant secret for token generation |

### Building a Specific Version

To build from a specific branch or tag of the Levee server:

```bash
# Build from a specific branch
docker compose build --build-arg LEVEE_REF=feature-branch

# Build from a specific tag
docker compose build --build-arg LEVEE_REF=v1.0.0
```

## Dockerfile Details

The `Dockerfile.levee-server` uses a multi-stage build:

1. **Builder stage**: Clones the [tylerbutler/levee](https://github.com/tylerbutler/levee) repository and builds an Elixir release
2. **Runtime stage**: Minimal Alpine image with just the compiled release

This approach ensures:
- Reproducible builds from source
- Small runtime image (~50MB)
- No build tools in production image

## Troubleshooting

### Server won't start

Check the logs:
```bash
docker compose logs levee
```

Common issues:
- Port 4000 already in use: Stop other services or change the port in `docker-compose.yml`
- Build failures: Ensure you have internet access for cloning the repo

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
