---
"repopo": minor
---

Add 14 new Rust/Cargo.toml policies for enforcing best practices in Rust projects:

- **Cargo.toml**: `CargoTomlRequired`, `CargoTomlSorted`, `CargoLintsConfigured`
- **Project structure**: `RustToolchainExists`, `RustfmtConfigExists`, `CargoLockPolicy`, `NoTargetArtifacts`
- **Security**: `NoWildcardDependencies`, `NoUnsafeWithoutJustification`
- **Documentation**: `PublicApiDocumented`, `RustDocExists`
- **Workspace**: `WorkspaceMembersValid`, `SharedDependencyVersions`, `WorkspaceInheritance`

Also adds `defineCargoPolicy` helper for creating Cargo.toml-targeted policies, and `smol-toml` as an optional peer dependency for TOML parsing.
