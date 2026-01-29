# Levee Server Docker Setup

This directory contains Docker configuration for running the Levee server locally for integration testing.

## Quick Start (Published Image)

The simplest way to run the Levee server is using the published Docker image:

```bash
# From the levee-driver package directory
cd packages/levee-driver

# Start the Levee server (pulls from ghcr.io/tylerbutler/levee:latest)
pnpm test:integration:up

# Run integration tests
pnpm test:integration

# View server logs
pnpm test:integration:logs

# Stop the server
pnpm test:integration:down
```

## Building from Local Source

To test against a local development version of the Levee server:

```bash
# Set path to your local levee checkout
export LEVEE_SOURCE_PATH=/path/to/levee

# Start the server (builds from source)
pnpm test:integration:up:local

# Run tests, view logs, stop (same as above)
pnpm test:integration
pnpm test:integration:logs
pnpm test:integration:down
```

**Note:** The local build requires the levee repo to have a `Dockerfile` at its root.

## Server Endpoints

The server will be available at:
- HTTP: http://localhost:4000
- WebSocket: ws://localhost:4000/socket

## Configuration

### Environment Variables

The following environment variables can be used to configure the tests:

| Variable | Default | Description |
|----------|---------|-------------|
| `LEVEE_SOURCE_PATH` | (none) | Path to local levee repo (for local builds) |
| `LEVEE_HTTP_URL` | `http://localhost:4000` | HTTP API endpoint |
| `LEVEE_SOCKET_URL` | `ws://localhost:4000/socket` | WebSocket endpoint |
| `LEVEE_TENANT_KEY` | `dev-tenant-secret-key` | Tenant secret for token generation |

## Troubleshooting

### Server won't start

Check the logs:
```bash
docker compose logs levee
```

Common issues:
- Port 4000 already in use: Stop other services or change the port in `docker-compose.yml`
- Image not found: Run `docker compose pull` to fetch the latest image

### Local build fails

- Ensure `LEVEE_SOURCE_PATH` points to a valid levee checkout
- Ensure the levee repo has a `Dockerfile` at its root
- Check that your levee checkout is on a valid branch

### Tests fail to connect

Ensure the server is healthy:
```bash
docker compose ps
curl http://localhost:4000/health
```

### Force pull latest image

```bash
docker compose pull
docker compose up -d
```

### Rebuild local image from scratch

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml build --no-cache
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
```
