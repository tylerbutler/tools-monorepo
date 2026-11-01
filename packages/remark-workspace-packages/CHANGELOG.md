# remark-workspace-packages

## 0.1.0

### Minor Changes

- Add a remark plugin that generates and updates Markdown tables of workspace packages. _[`#498`](https://github.com/tylerbutler/tools-monorepo/pull/498) [`dea2112`](https://github.com/tylerbutler/tools-monorepo/commit/dea21120aff01d136469d57c54929ad3261689a7) [@tylerbutler](https://github.com/tylerbutler)_

	Discover packages from `pnpm-workspace.yaml` or `package.json` workspaces.
	
	Choose columns for package names, descriptions, paths, and private status, and filter packages with include or exclude glob patterns.
	Package names link to their directories by default, and descriptions edited in the table are preserved when it is regenerated.
