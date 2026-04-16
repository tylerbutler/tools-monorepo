# remark-task-table

## 0.2.0

### Minor Changes

- Add remark-task-table plugin for generating task tables from package.json scripts, Nx targets, and justfile recipes _[`#495`](https://github.com/tylerbutler/tools-monorepo/pull/495) [`80174d4`](https://github.com/tylerbutler/tools-monorepo/commit/80174d489d1c34aa89bc29c66e745a3448927a3e) [@tylerbutler](https://github.com/tylerbutler)_

  Features:

  - Automatically detects Nx workspaces and uses `nx show project --json` for target extraction
  - Hierarchical sorting: orchestration targets (nx:noop) appear before their dependencies
  - Preserves user-edited descriptions across runs
  - Supports glob patterns for excluding tasks

## 0.1.0

- Initial release
