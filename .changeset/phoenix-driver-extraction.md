---
"@tylerbu/levee-driver": minor
"@tylerbu/levee-client": minor
---

Extract Levee driver to separate package

- **@tylerbu/levee-driver**: New package providing a Fluid Framework driver for Levee servers. Uses Phoenix Channels for real-time WebSocket communication.
  - `LeveeDocumentServiceFactory` - Main entry point for the driver
  - `LeveeUrlResolver` - URL resolver for Levee servers
  - `InsecureLeveeTokenProvider` - Token provider for development/testing
  - `RemoteLeveeTokenProvider` - Token provider for production use

- **@tylerbu/levee-client**: Removed driver exports (moved to @tylerbu/levee-driver). The package now focuses on high-level Tinylicious-compatible client operations.
