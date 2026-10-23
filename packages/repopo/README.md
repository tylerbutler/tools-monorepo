# repopo - police the files in your git repo with extensible policies

repopo is a tool to apply policies to the files in your git repo. You can think of it as a sort of lint tool for any
file in your git repo, with a straightforward way to write your own policies.

**Documentation: <https://repopo.tylerbutler.com>**

<!-- toc -->
* [repopo - police the files in your git repo with extensible policies](#repopo---police-the-files-in-your-git-repo-with-extensible-policies)
* [Quick start](#quick-start)
* [Documentation](#documentation)
* [CLI Usage](#cli-usage)
<!-- tocstop -->

# Quick start

Install repopo as a dev dependency:

```bash
pnpm add -D repopo
```

Create `repopo.config.ts` in the root of the repo:

```ts
import { policy, type RepopoConfig } from "repopo";
import { NoJsFileExtensions, PackageJsonSorted } from "repopo/policies";

export default {
	policies: [
		policy(NoJsFileExtensions, undefined, { exclude: ["^bin/"] }),
		policy(PackageJsonSorted),
	],
} satisfies RepopoConfig;
```

Then check the repo, and fix what can be fixed automatically:

```bash
repopo check
repopo check --fix
```

# Documentation

- [Configuration](https://repopo.tylerbutler.com/usage/config/): choosing policies, policy options, and file exclusions
- [Built-in policies](https://repopo.tylerbutler.com/policies/built-in/): every included policy and its options
- [Custom policies](https://repopo.tylerbutler.com/policies/custom/): writing file and repository policies
- [Programmatic API](https://repopo.tylerbutler.com/usage/programmatic-api/): running policies with `PolicyRunner`
- [Benchmarking](https://repopo.tylerbutler.com/usage/benchmarking/): comparing the TypeScript and Rust engines
- [API reference](https://repopo.tylerbutler.com/api/readme/)

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

  Runs the Rust-based repopo-core engine with the Node.js sidecar. This provides the same policy checking as 'check' but
  with Rust-based file enumeration, regex matching, and orchestration for better performance. Repository policies always
  run with the full repository inventory, including with --stdin. With --fix, repository policies can modify files
  outside the stdin selection.
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
