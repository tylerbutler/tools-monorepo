---
"repopo": minor
---

Add NoPrivateWorkspaceDependencies policy that prevents publishable packages from depending on private workspace packages via the `workspace:` protocol. This catches configuration issues where a public npm package would fail to install because its workspace dependencies aren't published.

The policy:
- Detects workspace dependencies using the `workspace:` protocol
- Checks if those dependencies are marked as private
- Reports violations for publishable packages that depend on private packages
- Supports configurable `checkDevDependencies` option (default: false)
- Uses workspace configuration (pnpm-workspace.yaml or package.json workspaces) for package discovery
