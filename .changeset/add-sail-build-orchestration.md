---
"@tylerbu/sail": minor
---

Add Sail build orchestration CLI tool for monorepos

Introduces Sail, a powerful build orchestration CLI tool designed specifically for monorepos. Sail provides intelligent task execution with dependency resolution, incremental builds, and parallel processing capabilities. It analyzes package dependencies and executes build tasks in optimal order, dramatically improving build performance in complex monorepo environments.

The tool supports flexible task configuration through multiple file formats (sailrc, sail.config.js/ts, or package.json), declarative task definitions with dependency expansion syntax, and advanced features including persistent file-based caching, worker thread pooling for compilation tasks, and customizable parallel execution with priority queuing. Sail integrates seamlessly with TypeScript (tsc), Biome, API Extractor, and other build tools commonly used in TypeScript monorepos.

Key features include dependency-aware task scheduling using `dependsOn`, `before`, and `after` directives, smart change detection to avoid unnecessary rebuilds, configurable concurrency with optional worker thread support, and comprehensive build statistics with performance profiling. Run `sail build` to orchestrate your monorepo builds or `sail scan` to visualize how Sail interprets your repository structure.
