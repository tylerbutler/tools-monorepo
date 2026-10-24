# remark-workspace-packages

## 0.1.0

### Minor Changes

- Add remark-workspace-packages plugin for generating workspace package tables in markdown _[`#498`](https://github.com/tylerbutler/tools-monorepo/pull/498) [`dea2112`](https://github.com/tylerbutler/tools-monorepo/commit/dea21120aff01d136469d57c54929ad3261689a7) [@tylerbutler](https://github.com/tylerbutler)_

	
	Features:
	- Reads pnpm-workspace.yaml to discover packages
	- Generates markdown tables with configurable columns (name, description, version)
	- Supports glob patterns in workspace definitions
	- Preserves user-edited descriptions across runs
	- Links package names to their directories
