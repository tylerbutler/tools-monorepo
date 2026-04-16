# repopo

## 0.10.0

### Minor Changes

- Add new `policy()` function as simplified API for defining repository policies, replacing the more complex `makePolicy`/`makePolicyDefinition` workflow. _[`#617`](https://github.com/tylerbutler/tools-monorepo/pull/617) [`becd406`](https://github.com/tylerbutler/tools-monorepo/commit/becd4064e1434b2384cda991f2d0702d91ed5ed9) [@tylerbutler](https://github.com/tylerbutler)_

  New features:
  - `policy()` function with multiple overload signatures for defining policies concisely
  - `PolicyShape` interface for object-literal policy definitions
  - `ConfiguredPolicy` and `PolicyError` types for the new API surface
  - Five new script-focused policies: `RequiredScripts`, `ExactScripts`, `MutuallyExclusiveScripts`, `ConditionalScripts`, and `ScriptContains`
  - `isPolicyError` type guard and `convertLegacyResult`/`convertToPolicyFailure` conversion utilities

  Deprecations (old APIs still work but are marked `@deprecated`):
  - `makePolicy` → use `policy()` instead
  - `makePolicyDefinition` → use `PolicyShape` object literals instead
  - `PolicyFailure` → use `PolicyError` instead
  - `PolicyInstance` → use `ConfiguredPolicy` instead
  - `PolicyStandaloneResolver` → use `PolicyResolver` instead
  - `isPolicyFailure` → use `isPolicyError` instead

## 0.9.0

### Minor Changes

- Make `description` required on PolicyDefinition _[`#594`](https://github.com/tylerbutler/tools-monorepo/pull/594) [`c3d1b65`](https://github.com/tylerbutler/tools-monorepo/commit/c3d1b65299f58b9fa605ebd18e7fb4346ae7745f) [@tylerbutler](https://github.com/tylerbutler)_

  BREAKING CHANGE: `PolicyDefinition.description` is now required (was optional). All policies must include a description that explains their purpose.

  All built-in policies now include descriptions.

- Use object parameters for policy factory functions and Policy class _[`#594`](https://github.com/tylerbutler/tools-monorepo/pull/594) [`c3d1b65`](https://github.com/tylerbutler/tools-monorepo/commit/c3d1b65299f58b9fa605ebd18e7fb4346ae7745f) [@tylerbutler](https://github.com/tylerbutler)_

  BREAKING CHANGES:
  - `makePolicyDefinition()` now takes an object argument: `{ name, description, match, handler, defaultConfig?, resolver? }`
  - `definePackagePolicy()` now takes an object argument: `{ name, description, handler }`
  - `defineFileHeaderPolicy()` now takes an object argument: `{ name, description, config }`
  - `Policy` class constructor now takes a `PolicyDefinition` object instead of positional arguments

  This change makes it easier to add new optional properties in the future without breaking changes.

  New exports:
  - `makePolicyDefinition` function (previously internal)
  - `PolicyDefinitionInput` type
  - `DefinePackagePolicyArgs` interface
  - `DefineFileHeaderPolicyArgs` interface

### Patch Changes

- Refactor to use Effection 4 for structured concurrency _[`#379`](https://github.com/tylerbutler/tools-monorepo/pull/379) [`1582ad1`](https://github.com/tylerbutler/tools-monorepo/commit/1582ad1abc79b211492dba2e5172e995c9c47fe0) [@tylerbutler](https://github.com/tylerbutler)_
  - Replace manual async handling with Effection's structured concurrency primitives
  - Policy handlers now support generator functions for better cancellation and resource management
  - Improved internal architecture for concurrent policy execution
  - Added comprehensive test coverage for async/generator patterns

<details><summary>Updated 1 dependency</summary>

<small>

[`c577266`](https://github.com/tylerbutler/tools-monorepo/commit/c577266129da545000aea343256b06129a243987)

</small>

- `@tylerbu/cli-api@0.10.1`

</details>

## 0.8.0

### Minor Changes

- **BREAKING CHANGE**: Change `PolicyFailure.errorMessage` to `errorMessages` array. _[`#552`](https://github.com/tylerbutler/tools-monorepo/pull/552) [`6b6317a`](https://github.com/tylerbutler/tools-monorepo/commit/6b6317a7be0a050dc0665a9af7b187afb1bb4b31) [@tylerbutler](https://github.com/tylerbutler)_

  The `PolicyFailure` interface now uses `errorMessages: string[]` instead of `errorMessage?: string`. This allows policies to report multiple error messages per failure and provides clearer semantics.

  Additionally, a new optional `manualFix?: string` property has been added to provide user guidance on how to resolve policy failures manually.

  Migration:
  - Change `errorMessage: "message"` to `errorMessages: ["message"]`
  - For multiple messages, use `errorMessages: ["msg1", "msg2"]`
  - When checking failures, use `errorMessages.join("\n")` instead of `errorMessage`

- Add NoPrivateWorkspaceDependencies policy that prevents publishable packages from depending on private workspace packages via the `workspace:` protocol. This catches configuration issues where a public npm package would fail to install because its workspace dependencies aren't published. _[`#534`](https://github.com/tylerbutler/tools-monorepo/pull/534) [`b7e4d4b`](https://github.com/tylerbutler/tools-monorepo/commit/b7e4d4b374cae228d246b16c668ba6e55c08f3dc) [@tylerbutler](https://github.com/tylerbutler)_

  The policy:
  - Detects workspace dependencies using the `workspace:` protocol
  - Checks if those dependencies are marked as private
  - Reports violations for publishable packages that depend on private packages
  - Supports configurable `checkDevDependencies` option (default: false)
  - Uses workspace configuration (pnpm-workspace.yaml or package.json workspaces) for package discovery

- Make sort-tsconfig and sort-package-json peer dependencies _[`#395`](https://github.com/tylerbutler/tools-monorepo/pull/395) [`ee059d0`](https://github.com/tylerbutler/tools-monorepo/commit/ee059d02161494c14eb6131aaf32624902fd65e4) [@tylerbutler](https://github.com/tylerbutler)_

  Moves `sort-tsconfig` and `sort-package-json` from dependencies to peerDependencies, allowing consumers to control versions and reducing bundle size.

- Add multiple new policies and enhance existing PackageScripts policy _[`#535`](https://github.com/tylerbutler/tools-monorepo/pull/535) [`79e19e8`](https://github.com/tylerbutler/tools-monorepo/commit/79e19e892a5b1193650cab21a4d38187c700fb01) [@tylerbutler](https://github.com/tylerbutler)_

  ## New Policies

  ### PackageAllowedScopes

  Validates that packages use only approved npm scopes or package names, preventing accidental
  introduction of new scopes and maintaining naming consistency.

  ### PackageLicense

  Ensures each package has a LICENSE file that matches the root repository LICENSE. Supports
  auto-fixing by copying the root LICENSE to packages. By default, skips private packages.

  ### PackageReadme

  Validates that packages have README.md files with proper content:
  - Ensures README exists
  - Validates title matches package name
  - Can require specific content (e.g., trademark notices)
  - Supports auto-fixing by creating or updating README files

  ## Enhanced PackageScripts Policy

  Added powerful new validation options with a cleaner, more intuitive configuration API.

  ### must (enhanced)

  The `must` array now accepts either strings (script must exist, no auto-fix) or objects with
  inline default values (script must exist, auto-fixable with the default):

  ```typescript
  must: [
    "test", // Must exist, no auto-fix available
    { build: "tsc" }, // Must exist, auto-fix adds "tsc" if missing
    { lint: "biome lint ." }, // Must exist, auto-fix adds "biome lint ." if missing
  ];
  ```

  Existing scripts with different content will pass validation - only the existence is enforced.

  ### exact (new)

  Scripts that must exist AND have exact content. Both missing and mismatched scripts are
  auto-fixable:

  ```typescript
  exact: {
    clean: "rimraf dist esm",
    format: "biome format --write .",
  }
  ```

  ### conditionalRequired (enhanced)

  Enforce that certain scripts must exist when other scripts are present. The `requires` field
  now accepts the same format as `must` - strings or objects with inline defaults for auto-fix:

  ```typescript
  // With inline default - auto-fixable
  conditionalRequired: [
    { ifPresent: "build", requires: [{ clean: "rimraf dist" }] },
  ];

  // Mixed: "test" required without default, "clean" with default
  conditionalRequired: [
    { ifPresent: "build", requires: ["test", { clean: "rimraf dist" }] },
  ];
  ```

  ### scriptMustContain

  Validate that script bodies contain required substrings:

  ```typescript
  scriptMustContain: [{ script: "clean", mustContain: ["rimraf"] }];
  ```

  ## Usage Examples

  ```typescript
  import { makePolicy, type RepopoConfig } from "repopo";
  import {
    PackageAllowedScopes,
    PackageLicense,
    PackageReadme,
    PackageScripts,
  } from "repopo/policies";

  const config: RepopoConfig = {
    policies: [
      makePolicy(PackageAllowedScopes, {
        allowedScopes: ["@myorg", "@internal"],
      }),
      makePolicy(PackageLicense),
      makePolicy(PackageReadme, {
        requiredContent: "## Trademark",
      }),
      makePolicy(PackageScripts, {
        // Scripts that must exist
        must: [
          "test", // Must exist, no auto-fix
          { build: "tsc" }, // Must exist, auto-fix available
          { lint: "biome lint ." }, // Must exist, auto-fix available
        ],
        // Scripts that must exist AND match exactly
        exact: {
          clean: "rimraf dist esm",
          format: "biome format --write .",
        },
        // If "build" exists, "clean" must also exist (with inline auto-fix default)
        conditionalRequired: [
          { ifPresent: "build", requires: [{ clean: "rimraf dist" }] },
        ],
        // Validate script content contains required substrings
        scriptMustContain: [{ script: "build", mustContain: ["tsc"] }],
        // Only one of these can exist
        mutuallyExclusive: [["lint:eslint", "lint:biome"]],
      }),
    ],
  };
  ```

### Patch Changes

- Update to use new cli-api logger API _[`#395`](https://github.com/tylerbutler/tools-monorepo/pull/395) [`ee059d0`](https://github.com/tylerbutler/tools-monorepo/commit/ee059d02161494c14eb6131aaf32624902fd65e4) [@tylerbutler](https://github.com/tylerbutler)_

  Updates commands to use the new logger API from @tylerbu/cli-api:
  - Replace `errorLog()` calls with `logError()`
  - Use standalone `logIndent()` function where needed

<details><summary>Updated 1 dependency</summary>

<small>

[`ee059d0`](https://github.com/tylerbutler/tools-monorepo/commit/ee059d02161494c14eb6131aaf32624902fd65e4)

</small>

- `@tylerbu/cli-api@0.10.0`

</details>

## 0.7.1

### Patch Changes

<details><summary>Updated 1 dependency</summary>

<small>

[`8832369`](https://github.com/tylerbutler/tools-monorepo/commit/8832369318b6efee8adae1636f3629639b0d76ac)

</small>

- `@tylerbu/cli-api@0.9.0`

</details>

## 0.7.0

### Minor Changes

- Add configurable PackageScripts policy _[`#376`](https://github.com/tylerbutler/tools-monorepo/pull/376) [`c17462a`](https://github.com/tylerbutler/tools-monorepo/commit/c17462a8af35a8bfbb528f29825a0ef177923946) [@tylerbutler](https://github.com/tylerbutler)_

  Enhances the `PackageScripts` policy with flexible configuration options to enforce package.json script requirements across your repository. The policy now supports two validation modes:
  1.  **Required Scripts (`must`)**: Specify scripts that must be present in all package.json files
  2.  **Mutually Exclusive Scripts (`mutuallyExclusive`)**: Define groups of scripts where exactly one from each group must exist

  Example configuration:

  ```typescript
  makePolicy(PackageScripts, {
    must: ["build", "clean"],
    mutuallyExclusive: [
      ["test", "test:unit"], // Either "test" or "test:unit", not both
    ],
  });
  ```

  The policy validates that:
  - All scripts in the `must` array are present
  - For each group in `mutuallyExclusive`, exactly one script from that group exists (not zero, not multiple)

  This is useful for enforcing consistent npm script conventions across monorepo packages while allowing flexibility where needed.

- New built-in policies _[`#308`](https://github.com/tylerbutler/tools-monorepo/pull/308) [`1856d58`](https://github.com/tylerbutler/tools-monorepo/commit/1856d582fb92692447b02c89cdb45dcd3c5f7370) [@tylerbutler](https://github.com/tylerbutler)_

  Added three new policies for repository quality and safety:
  - **LicenseFileExists**: Ensures a LICENSE file exists in the repository root (essential for open source projects)
  - **NoLargeBinaryFiles**: Prevents large binary files from being committed (default 10MB max, suggests Git LFS for large assets)
  - **RequiredGitignorePatterns**: Validates .gitignore contains required patterns to prevent committing sensitive files, dependencies, and build artifacts (auto-fixable)

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`b0d8cb9`](https://github.com/tylerbutler/tools-monorepo/commit/b0d8cb9a9ee27a0b778ee58055bcbdd7d6d9b4eb) [`08e571f`](https://github.com/tylerbutler/tools-monorepo/commit/08e571f028e868d5db1c337e51804f5884cd2f4a) [`08e571f`](https://github.com/tylerbutler/tools-monorepo/commit/08e571f028e868d5db1c337e51804f5884cd2f4a)

</small>

- `@tylerbu/cli-api@0.8.0`
- `@tylerbu/fundamentals@0.3.0`

</details>

## 0.6.0

### Minor Changes

- Configuration changes _[`#224`](https://github.com/tylerbutler/tools-monorepo/pull/224) [`2b7db34`](https://github.com/tylerbutler/tools-monorepo/commit/2b7db343d74ab2e518ab2f232f47ea365ca784b8) [@tylerbutler](https://github.com/tylerbutler)_

  The configuration for repopo has changed a lot in this release. The goal is to improve the typing of config and make it
  easier to configure things in one place.

  Policies are now declared as `PolicyDefinition`, and are then combined with a configuration (if the policy has
  configuration) using `makePolicy` to form a `PolicyInstance`, which is the primary type used internally.

  Generators now generate `PolicyDefinition`s, and can be used directly inline with `makePolicy`.

- Export policies from /policies entrypoint only _[`#224`](https://github.com/tylerbutler/tools-monorepo/pull/224) [`2b7db34`](https://github.com/tylerbutler/tools-monorepo/commit/2b7db343d74ab2e518ab2f232f47ea365ca784b8) [@tylerbutler](https://github.com/tylerbutler)_

  Policies included with repopo are now exported from `repopo/policies`.

### Patch Changes

- Update package metadata _[`#221`](https://github.com/tylerbutler/tools-monorepo/pull/221) [`9e5225a`](https://github.com/tylerbutler/tools-monorepo/commit/9e5225abfb67af1575af13dff60830d8da28eafd) [@tylerbutler](https://github.com/tylerbutler)_

<details><summary>Updated 2 dependencies</summary>

<small>

[`9e5225a`](https://github.com/tylerbutler/tools-monorepo/commit/9e5225abfb67af1575af13dff60830d8da28eafd)

</small>

- `@tylerbu/fundamentals@0.2.2`
- `@tylerbu/cli-api@0.7.2`

</details>

## 0.5.0

### Minor Changes

- Export all default policies _[`#213`](https://github.com/tylerbutler/tools-monorepo/pull/213) [`3fc530b`](https://github.com/tylerbutler/tools-monorepo/commit/3fc530bad66259339547b3d8ec12b9265daea9a5) [@tylerbutler](https://github.com/tylerbutler)_

  repopo now exports all included policies individually so users can opt in and out of them in their config.

- New policies _[`#31`](https://github.com/tylerbutler/tools-monorepo/pull/31) [`c97a565`](https://github.com/tylerbutler/tools-monorepo/commit/c97a56518d9726667531aa71de9445fed8d56b96) [@tylerbutler](https://github.com/tylerbutler)_
  - JsTsFileHeaders
  - HtmlFileHeaders
  - PackageScripts

- API changes: _[`#120`](https://github.com/tylerbutler/tools-monorepo/pull/120) [`1108950`](https://github.com/tylerbutler/tools-monorepo/commit/1108950a7732dcc3ac9b8da10bd014bfec6c45b7) [@tylerbutler](https://github.com/tylerbutler)_
  - **Breaking change**: `PolicyConfig` was renamed to `RepopoConfig`.
  - **Breaking change**: Removed several flags from the check command.

  Other changes:
  - Refactor check command for clarity (more to do)

- Functions to more easily create package.json handlers _[`#190`](https://github.com/tylerbutler/tools-monorepo/pull/190) [`84c4185`](https://github.com/tylerbutler/tools-monorepo/commit/84c4185e76186c3489a4b70e3a3015ba289df139) [@tylerbutler](https://github.com/tylerbutler)_

  repopo now provides functions that can be used to generate policies for common files like package.json.

### Patch Changes

- Update dependencies _[`#217`](https://github.com/tylerbutler/tools-monorepo/pull/217) [`dcec014`](https://github.com/tylerbutler/tools-monorepo/commit/dcec014dfb70e5804a7535b5b8b9a3406f3e623d) [@tylerbutler](https://github.com/tylerbutler)_

<details><summary>Updated 2 dependencies</summary>

<small>

[`dcec014`](https://github.com/tylerbutler/tools-monorepo/commit/dcec014dfb70e5804a7535b5b8b9a3406f3e623d)

</small>

- `@tylerbu/fundamentals@0.2.1`
- `@tylerbu/cli-api@0.7.1`

</details>

## 0.4.0

### Minor Changes

- Improve cross-platform path handling _[`#176`](https://github.com/tylerbutler/tools-monorepo/pull/176) [`2d095c7`](https://github.com/tylerbutler/tools-monorepo/commit/2d095c7828037fc58147d0aa487b736dbd345472) [@tylerbutler](https://github.com/tylerbutler)_

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`a4b7624`](https://github.com/tylerbutler/tools-monorepo/commit/a4b7624cceea2f7246391c2d54329010cbb145ff) [`e27ae36`](https://github.com/tylerbutler/tools-monorepo/commit/e27ae3682d093eb61c2cb31de787ec378287db4f) [`ede1957`](https://github.com/tylerbutler/tools-monorepo/commit/ede19579ffc630f6e176046c6e11e170849a0d48) [`33b9c01`](https://github.com/tylerbutler/tools-monorepo/commit/33b9c01ed2d5d0c4bdb32262f549531650c48ad0) [`2d095c7`](https://github.com/tylerbutler/tools-monorepo/commit/2d095c7828037fc58147d0aa487b736dbd345472)

</small>

- `@tylerbu/cli-api@0.7.0`
- `sort-tsconfig@0.2.0`

</details>

## 0.3.2

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`7406bbf`](https://github.com/tylerbutler/tools-monorepo/commit/7406bbf1131028058178d53f4e64564660c4d495)

</small>

- `@tylerbu/cli-api@0.6.1`
- `sort-tsconfig@0.1.4`

</details>

## 0.3.1

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`b894a2d`](https://github.com/tylerbutler/tools-monorepo/commit/b894a2dfd5538247d1a625b423e61b437207f137) [`b894a2d`](https://github.com/tylerbutler/tools-monorepo/commit/b894a2dfd5538247d1a625b423e61b437207f137)

</small>

- `@tylerbu/cli-api@0.6.0`
- `sort-tsconfig@0.1.3`

</details>

## 0.3.0

### Minor Changes

- New command: `list` _[`#132`](https://github.com/tylerbutler/tools-monorepo/pull/132) [`1fa083d`](https://github.com/tylerbutler/tools-monorepo/commit/1fa083dd64499d108411326377a4463ad6acb040) [@tylerbutler](https://github.com/tylerbutler)_

  The `repopo list` command lists the policies that are enabled in the repo.

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`f803610`](https://github.com/tylerbutler/tools-monorepo/commit/f803610f64936c5d49d862b2f4240ea248fe3f76)

</small>

- `@tylerbu/cli-api@0.5.0`
- `sort-tsconfig@0.1.2`

</details>

## 0.2.2

### Patch Changes

- Publish repopo package _[`#125`](https://github.com/tylerbutler/tools-monorepo/pull/125) [`12b3a58`](https://github.com/tylerbutler/tools-monorepo/commit/12b3a58e8946b0988009331bf1830e1fa1cc6567) [@tylerbutler](https://github.com/tylerbutler)_

## 0.2.1

### Patch Changes

<details><summary>Updated 1 dependency</summary>

<small>

[`61fade5`](https://github.com/tylerbutler/tools-monorepo/commit/61fade577c27a6ad55c79d997eb42ecc0ca9abe9)

</small>

- `sort-tsconfig@0.1.1`

</details>

## 0.2.0

### Minor Changes

- PackageJsonSortedPolicy keeps package.json files sorted _[`#114`](https://github.com/tylerbutler/tools-monorepo/pull/114) [`0664ac5`](https://github.com/tylerbutler/tools-monorepo/commit/0664ac5731c5dd23bc1c21070fe880335f46489b) [@tylerbutler](https://github.com/tylerbutler)_

  The new `PackageJsonSortedPolicy` policy enforces that package.json files are always sorted according to sort-package-json.

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`cbdec3f`](https://github.com/tylerbutler/tools-monorepo/commit/cbdec3f7b3daa4ec642b44a5de046fff8420f15a) [`d55c982`](https://github.com/tylerbutler/tools-monorepo/commit/d55c982f960b56a79f0e0d35dd9102a25882032f) [`ddcbd48`](https://github.com/tylerbutler/tools-monorepo/commit/ddcbd48a161d8be666ff537316fa018d8c0b7ad8)

</small>

- `@tylerbu/cli-api@0.4.0`
- `sort-tsconfig@0.1.0`

</details>

## 0.1.1

### Patch Changes

- Fix homepage URL _[`#99`](https://github.com/tylerbutler/tools-monorepo/pull/99) [`0654323`](https://github.com/tylerbutler/tools-monorepo/commit/06543231947fa5267863e5467d5837a51cf3d44b) [@tylerbutler](https://github.com/tylerbutler)_

<details><summary>Updated 1 dependency</summary>

<small>

[`0654323`](https://github.com/tylerbutler/tools-monorepo/commit/06543231947fa5267863e5467d5837a51cf3d44b)

</small>

- `@tylerbu/cli-api@0.3.1`

</details>

## 0.1.0

### Minor Changes

- Introducing repopo, a tool to make sure the files in a git repository adhere to configurable policies _[`#16`](https://github.com/tylerbutler/tools-monorepo/pull/16) [`030fd98`](https://github.com/tylerbutler/tools-monorepo/commit/030fd980ee45471074a8f41aab46d1a5b025b2f6) [@tylerbutler](https://github.com/tylerbutler)_

  You can use repopo to make sure all source files have a common header, check that all packages have a particular field
  in package.json, etc. You can extend repopo with your own policies or policies from the ecosystem.

  For more information, see the [repopo readme](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/README.md).

### Patch Changes

<details><summary>Updated 1 dependency</summary>

<small>

[`f54b0e7`](https://github.com/tylerbutler/tools-monorepo/commit/f54b0e71dd1d54c5e3730b7a1f1ab1a53b9b7943)

</small>

- `@tylerbu/cli-api@0.3.0`

</details>
