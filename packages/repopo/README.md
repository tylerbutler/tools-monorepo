# @tylerbu/repopo - police the files in your git repo with extensible policies

repopo is a tool to apply policies to the files in your git repo. You can think of it as a sort of lint tool for any
file in your git repo, with a straightforward way to write your own policies.

<!-- toc -->
* [@tylerbu/repopo - police the files in your git repo with extensible policies](#tylerburepopo---police-the-files-in-your-git-repo-with-extensible-policies)
* [Included policies](#included-policies)
* [Usage](#usage)
<!-- tocstop -->

# Included policies

repopo includes the following policies. All of the included policies are enabled by default.

# Usage

<!-- commands -->
* [`repopo check`](#repopo-check)

## `repopo check`

Checks and applies policies to the files in the repository.

```
USAGE
  $ repopo check [-v | --quiet] [-f] [-D <value> | -d <value>] [-p <value>] [--stdin]

FLAGS
  -D, --excludePolicy=<value>...  Exclude policies by name. Can be specified multiple times to exclude multiple
                                  policies.
  -d, --policy=<value>            Filter policies to apply by <regex>. Only policies with a name matching the regex will
                                  be applied.
  -f, --fix                       Fix errors if possible.
  -p, --path=<value>              Filter file paths by <regex>.
      --stdin                     Read list of files from stdin.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.
```

_See code: [src/commands/check.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/commands/check.ts)_
<!-- commandsstop -->
