# repopo - police the files in your git repo with extensible policies

repopo is a tool to apply policies to the files in your git repo. You can think of it as a sort of lint tool for any
file in your git repo, with a straightforward way to write your own policies.

<!-- toc -->
* [repopo - police the files in your git repo with extensible policies](#repopo---police-the-files-in-your-git-repo-with-extensible-policies)
* [Configuring policies](#configuring-policies)
* [Included policies](#included-policies)
* [Policy generators](#policy-generators)
* [CLI Usage](#cli-usage)
<!-- tocstop -->

# Configuring policies

Repopo and its policies can be configured in a `repopo.config.ts` (or `.cjs`, or `.mjs`) file in the root of the repo. Using a
TypeScript configuration file is recommended.

The policy config must export a default object of the type `PolicyConfig`.

## Excluding files from policy check

By default, all files in the repo are checked. You can exclude files completely from the policy check by configuring the
d `excludeFiles` setting. It should be an array of strings/regular expressions. Paths that match any of these
expressions will be completely excluded from all policies.

You can exclude files from individual policies as well by configuring the `excludeFiles` setting when calling
`makePolicy`.

## Configuring individual policies

Individual policies can be configured by passing configuration settings to a `PolicyDefinition` in `makePolicy`.

# Included policies

repopo includes the following policies. All of the included policies are enabled by default.

## HtmlFileHeaders and JsTsFileHeaders

These policies set a common file header for JavaScript/TypeScript and HTML files.

### Configuration

TODO

## NoJsFileExtensions

The NoJsFileExtensions policy checks for JavaScript source files that just use the .js file extension. Such files may be
interpreted by Node.js as either CommonJS or ESM based on the `type` field in the nearest package.json file. This can
create unexpected behavior for JS files; changing the package.json nearest to one will change how the JS is processed by
node. Using explicit file extensions reduces ambiguity and ensures a CJS file isn't suddenly treated like an ESM file.

## PackageJsonProperties

The PackageJsonProperties policy is used to enforce fields in package.json files across the repo.

### Configuration

The `verbatim` setting requires that all the configured fields in package.json match the values in the configuration.

```ts
import type { PolicyConfig } from "@tylerbu/repopo";
const config: PolicyConfig = {
	policySettings: {
		PackageJsonProperties: {
      // This setting will force all package.json files to contain these fields with the exact configured values.
			verbatim: {
				license: "MIT",
				author: "Tyler Butler <tyler@tylerbutler.com>",
				bugs: "https://github.com/tylerbutler/tools-monorepo/issues",
				repository: {
					type: "git",
					url: "git+https://github.com/tylerbutler/tools-monorepo.git",
				}
			}
		}
	}
};
```

## PackageJsonRepoDirectoryProperty

A RepoPolicy that checks that the `repository.directory` property in package.json is set correctly. If the repository
field is a string instead of an object the package will be ignored.

# Policy generators

There are some filetypes that often have policies applied to them, like package.json. You can use the policy generator
functions to generate policies for those filetypes. Using the generators is not required; they simply reduce the amount
of boilerplate code you have to write for a policy.

## generatePackagePolicy

Use `generatePackagePolicy` to generate policies for package.json files.

# CLI Usage

<!-- commands -->
* [`repopo check`](#repopo-check)
* [`repopo list`](#repopo-list)

## `repopo check`

Checks and applies policies to the files in the repository.

```
USAGE
  $ repopo check [-v | --quiet] [-f] [--stdin]

FLAGS
  -f, --fix    Fix errors if possible.
      --stdin  Read list of files from stdin.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.
```

_See code: [src/commands/check.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/commands/check.ts)_

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
