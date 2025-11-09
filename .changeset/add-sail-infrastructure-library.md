---
"@tylerbu/sail-infrastructure": minor
---

Add Sail infrastructure library for monorepo workspace and release group management

Introduces the Sail infrastructure library, a TypeScript package that provides core infrastructure for organizing npm packages into workspaces and release groups within a monorepo. This library serves as the foundation for build tooling and repository management, offering a hierarchical model where a build project contains workspaces, which in turn organize packages into release groups.

The library implements a clear separation between physical package layout (workspaces) and logical versioning groups (release groups), enabling flexible repository organization strategies. It includes powerful package selection and filtering APIs with support for workspace-based selection, release group filtering, Git-aware change detection, and glob pattern matching using micromatch. The configuration system uses cosmiconfig and supports multiple formats including v1 (legacy) and v2 configurations, with automatic workspace detection via @manypkg/get-packages.

Core features include strongly-typed build project, workspace, release group, and package interfaces, comprehensive Git integration for changed file detection and merge base operations, package manager abstraction supporting pnpm, npm, and yarn, version management utilities for coordinated version updates across release groups, and flexible filtering APIs for selecting package subsets based on various criteria. The package also includes a CLI tool for inspecting build project structure and validating configuration.
