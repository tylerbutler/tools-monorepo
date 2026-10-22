# repopo - police the files in your git repo with extensible policies

repopo is a tool to apply policies to the files in your git repo. You can think of it as a sort of lint tool for any
file in your git repo, with a straightforward way to write your own policies.

<!-- toc -->
* [repopo - police the files in your git repo with extensible policies](#repopo---police-the-files-in-your-git-repo-with-extensible-policies)
* [Configuring policies](#configuring-policies)
* [Included policies](#included-policies)
* [Policy generators](#policy-generators)
* [Programmatic API](#programmatic-api)
* [Benchmarking](#benchmarking)
* [CLI Usage](#cli-usage)
<!-- tocstop -->

# Configuring policies

Repopo and its policies can be configured in a `repopo.config.ts` (or `.cjs`, or `.mjs`) file in the root of the repo. Using a
TypeScript configuration file is recommended.

Export a default object of type `RepopoConfig`:

```ts
import { makePolicy, type RepopoConfig } from "repopo";
import { NoJsFileExtensions } from "repopo/policies";

export default {
	policies: [
		makePolicy(NoJsFileExtensions, { exclude: ["^bin/"] }),
	],
} satisfies RepopoConfig;
```

Use only `makePolicy(definition, { config, exclude, instanceId })`. Omit the
options object when no options are needed. Repeated policy names require
explicit unique instance IDs.

This is an intentional pre-1.0 breaking change. See the
[1.0 API migration guide](https://repopo.tylerbutler.com/usage/migration/).

Omit `policies` to use the default policies with either `check` or `check-native`.
Set `policies: []` to disable them.

With `check --fix`, policies run in configuration order for each file so that one
fix does not overwrite another. Read-only checks run up to 8 files concurrently;
policies within a file remain ordered.

## Repository policies

File policies run once per matching selected file. Policies with
`scope: "repository"` run once after all file policies, even when no files are
selected. Both scopes use the same `policies` array and `makePolicy()` helper.

Both scopes return `PolicyResult = readonly PolicyFinding[]`; `[]` passes.
Repository handlers receive `{ root, files, resolve, config }`. Findings use
`message`, optional `manualFix`, and optional `fixStatus` (`"available"`,
`"fixed"`, or `"failed"`). Only `"fixed"` resolves a finding, and fixed findings
remain in results. Fixed/failed statuses are invalid in check mode.
Repository findings can include `files` locations or omit them for a
repository-level violation. File handlers must not supply `files`.
Repository policies perform inline fixes using `resolve`; they have no resolver.

With `--stdin`, file policies check the input paths, but repository policies
still receive the full Git file inventory after global and per-policy exclusions.
With `--fix`, repository policies run serially in configuration order and can
modify files outside stdin. The inventory is refreshed before each repository
policy. These rules apply to both `check` and `check-native`.

`LicenseFileExists` and `SharedDependencyVersions` use repository scope. Their
handlers accept the full eligible `files` inventory and return finding arrays.
Configure either policy with `makePolicy()`.

## Excluding files from policy check

By default, all files in the repo are checked. You can exclude files completely from the policy check by configuring the
`excludeFiles` setting. It should be an array of strings/regular expressions. Paths that match any of these
expressions will be completely excluded from all policies.

Strings are case-insensitive regular expressions, not globs. Use `"^vendor/"`,
not `"**/vendor/**"`. `RegExp` values retain their flags, so `/^README/` does not
exclude `readme.md`.

For per-policy exclusions, use `makePolicy(definition, { exclude: patterns })`.
Only the global configuration uses `excludeFiles`.

## Configuring individual policies

Use `makePolicy(definition, { config: settings })`. Omitted or undefined config
selects `defaultConfig`. Explicit config replaces the whole default; it is not
merged. An allowed null value stays supplied. Definitions with
`requiresConfig: true` need complete configuration or a complete default.
Configuration fields named `exclude` do not become instance exclusions.

# Included policies

Import built-in policies from `repopo/policies`. `DefaultPolicies` contains
`NoJsFileExtensions`, `PackageJsonRepoDirectoryProperty`, and `PackageJsonSorted`.
Configure other policies to enable them.

## HtmlFileHeaders and JsTsFileHeaders

Use `HtmlFileHeaders` for `.html` and `.htm` files, and `JsTsFileHeaders` for
JavaScript and TypeScript files.

### Configuration

Use `makePolicy(HtmlFileHeaders, { config: { headerText: "Copyright Example" } })`,
or the same options with `JsTsFileHeaders`. Header configuration is required.
Checks compare the file header with that configured text; `--fix` adds a missing header.

## NoJsFileExtensions

The NoJsFileExtensions policy checks for JavaScript source files that just use the .js file extension. Such files may be
interpreted by Node.js as either CommonJS or ESM based on the `type` field in the nearest package.json file. This can
create unexpected behavior for JS files; changing the package.json nearest to one will change how the JS is processed by
node. Using explicit file extensions reduces ambiguity and ensures a CJS file isn't suddenly treated like an ESM file.

## PackageJsonProperties

The PackageJsonProperties policy is used to enforce fields in package.json files across the repo.

### Configuration

The `verbatim` setting requires that all the configured fields in package.json match the values in the configuration.
Array values replace existing arrays rather than append to them. Unspecified object fields remain unchanged.

```ts
import { makePolicy, type RepopoConfig } from "repopo";
import { PackageJsonProperties } from "repopo/policies";

export default {
	policies: [
		makePolicy(PackageJsonProperties, {
			config: {
				verbatim: {
					license: "MIT",
					author: "Tyler Butler <tyler@tylerbutler.com>",
					bugs: "https://github.com/tylerbutler/tools-monorepo/issues",
					repository: {
						type: "git",
						url: "git+https://github.com/tylerbutler/tools-monorepo.git",
					},
				},
			},
		}),
	],
} satisfies RepopoConfig;
```

## PackageJsonRepoDirectoryProperty

A RepoPolicy that checks that the `repository.directory` property in package.json is set correctly. If the repository
field is a string instead of an object the package will be ignored.

# Policy generators

There are some filetypes that often have policies applied to them, like package.json. You can use the policy generator
functions to generate policies for those filetypes. Using the generators is not required; they simply reduce the amount
of boilerplate code you have to write for a policy.

## definePackagePolicy

Use `definePackagePolicy`, `defineCargoPolicy`, `defineGleamPolicy`, and
`defineFileHeaderPolicy` for common file types. Write object literals with
`satisfies FilePolicyDefinition<C>` or `satisfies RepositoryPolicyDefinition<C>`
for custom definitions; `PolicyDefinition` is their union and
`ConfiguredPolicy` is the configured union. Async and Effection generator
handlers remain supported. See the [custom policy guide](https://repopo.tylerbutler.com/policies/custom/).

# Programmatic API

Import policy types, factories, adapters, `runPolicies`, and `PolicyRunner` from `repopo/api`.
The root `repopo` entry point exports the same API plus OCLIF's CLI `run` function.
Use the Promise facade:

```ts
import { makePolicy, runPolicies } from "repopo/api";
import { NoJsFileExtensions } from "repopo/policies";

const results = await runPolicies({
	policies: [makePolicy(NoJsFileExtensions)],
	root: process.cwd(),
	files: ["src/main.mjs"],
	fix: false,
	concurrency: 8,
});
```

For Effection, use `await run(() => new PolicyRunner(options).run())` with
`run` imported from `effection`. Both runners share options and results.
Options include `policies`, `root`, `files`, `inventory`, `exclude`, `fix`,
`concurrency`, and `signal`. Repository policies require explicit full inventory
or an async loader; selection is never inventory. Empty selection still runs
repository checks. An array is a static snapshot; a loader refreshes after file
fixes and between repository fixers.

Results separate `findings`, `errors`, `skipped`, and `perfStats`. Findings and
errors carry policy identity, scope, and scope-safe locations. Errors preserve
original causes. Registration/input errors throw. Read-only execution errors
collect and work continues. A fix file error stops remaining work on that file,
continues other files, and skips repository work. A repository fix error skips
later repository policies. Unresolved findings do not trigger these boundaries.
Both CLIs fail on errors or unresolved findings, not excluded work.
Cancellation releases owned resources and propagates; writes are not rolled back.

Standalone file `PolicyResolver` functions receive and return findings.
Inline fixed/failed findings suppress standalone resolution. Preserve messages
and duplicate-message order when updating findings; omitted findings remain
unresolved, so `[]` is not blanket success.

`check-native` retains Rust matching and orchestration, with per-policy
sidecar execution and shared validation. Native cancellation waits for cleanup.

# Benchmarking

From a source checkout, compile TypeScript and build the release engine:

```bash
pnpm nx run repopo:build:compile
cargo build --release --manifest-path packages/repopo/crates/core/Cargo.toml
./packages/repopo/benchmark.sh --quick
./packages/repopo/benchmark.sh --json /tmp/repopo-benchmark.json
```

The benchmark needs Node and the release binary; Bun is optional. It uses no
Hyperfine dependency. Each round runs all cases sequentially in shuffled order
to reduce ordering bias. Defaults are three warmup rounds and ten timed rounds;
`--quick` uses one and three. Override with `--warmup N` and `--runs N`.
Every command must exit successfully; policy violations and runtime errors abort
the benchmark with diagnostic output. No fixes are applied.

The matrix compares TypeScript, the direct Rust engine with Node/Bun, and the
actual `check-native` CLI with Node/Bun. Native cases explicitly use the release
binary. All stdin cases share one Git inventory snapshot.

| Scenario | Workload |
| --- | --- |
| `startup` | Top-level help; CLI/binary startup without a policy check |
| `empty` | Empty config and empty stdin; check initialization and sidecar startup |
| `inventory-stdin` | Empty config with the file snapshot; input parsing and file routing |
| `inventory-git` | Empty config with Git enumeration instead of stdin |
| `config` | Twenty synthetic policies with empty stdin; policy setup without file matching |
| `matching` | Same policies and snapshot, with no matches; matching without handlers |
| `noop` | Twenty policies matching every path, each returning `true`; dispatch and no-op handlers |
| `real-stdin` | Repository config with the snapshot |
| `real-git` | Normal repository-config check with Git enumeration |

Use repeated `--scenario NAME` options to select workloads. JSON output includes
machine/runtime metadata, commands, inputs, raw samples with round/order, and
median, mean, standard deviation, quartiles, and range in milliseconds.

Compare `inventory-git` with `inventory-stdin` for the enumeration path, `config`
with `empty` for synthetic policy setup, and `noop` with `matching` for successful
matching, dispatch, and handler overhead. Compare matching-minus-config with
inventory-stdin-minus-empty to estimate matching overhead beyond basic routing.
Compare each `cli-*` case with its `core-*` counterpart for wrapper overhead.
These are controlled workload contrasts, not exclusive phase timers: they
include interactions, serialization, and scheduling noise. Repository policies
still enumerate and check the full inventory in `real-stdin`. Real workloads
include config imports, file I/O, and policy-specific work. Results apply to
warm filesystem caches, not a controlled cold-cache run.

# CLI Usage

<!-- commands -->
* [`repopo check`](#repopo-check)
* [`repopo check-native`](#repopo-check-native)
* [`repopo list`](#repopo-list)

## `repopo check`

Checks and applies policies to the files in the repository.

```
USAGE
  $ repopo check [-v | --quiet] [--concurrency <value>] [-f] [--stdin]

FLAGS
  -f, --fix                  Fix errors if possible.
      --concurrency=<value>  [default: 8] Maximum concurrent files in read-only checks. Fixes remain sequential.
      --stdin                Read list of files from stdin.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Checks and applies policies to the files in the repository.

  File policies check selected files. Repository policies always run with the full repository file inventory, including
  with --stdin. With --fix, repository policies can modify files outside the stdin selection.
```

_See code: [src/commands/check.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/commands/check.ts)_

## `repopo check-native`

Checks and applies policies using the Rust engine.

```
USAGE
  $ repopo check-native [--concurrency <value>] [-f] [--stdin] [-v] [-q] [-c <value>] [--sidecar-path <value>]
    [--binary-path <value>] [--runtime auto|node|bun]

FLAGS
  -c, --config=<value>        Path to the config file.
  -f, --fix                   Fix errors if possible.
  -q, --quiet                 Suppress all output except errors.
  -v, --verbose               Show verbose output including per-policy timing.
      --binary-path=<value>   [env: REPOPO_CORE_PATH] Path to the repopo-core Rust binary.
      --concurrency=<value>   [default: 8] Maximum concurrent files in read-only checks. Fixes remain sequential.
      --runtime=<option>      [env: REPOPO_RUNTIME] JS runtime for the sidecar process (auto, node, bun).
                              <options: auto|node|bun>
      --sidecar-path=<value>  [env: REPOPO_SIDECAR_PATH] Path to the Node.js sidecar script.
      --stdin                 Read list of files from stdin.

DESCRIPTION
  Checks and applies policies using the Rust engine.

  Runs the Rust-based repopo-core engine with the Node.js sidecar. Rust handles file matching, scheduling and reporting;
  the sidecar shares per-policy contracts with 'check'. Repository policies always run with the full repository
  inventory, including with --stdin. With --fix, repository policies can modify files outside the stdin selection.
```

_See code: [src/commands/check-native.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/commands/check-native.ts)_

## `repopo list`

Lists the policies configured to run.

```
USAGE
  $ repopo list [-v | --quiet]

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.
```

_See code: [src/commands/list.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/commands/list.ts)_
<!-- commandsstop -->
