---
title: CLI reference
---

<!-- commands -->
* [`repopo check`](#repopo-check)
* [`repopo list`](#repopo-list)

## `repopo check`

Checks and applies policies to the files in the repository.

```
USAGE
  $ repopo check [-f] [--stdin] [-D <value>... | -d <value>] [-p <value>]

FLAGS
  -D, --excludePolicy=<value>...  Exclude policies by name. Can be specified multiple times to exclude multiple
                                  policies.
  -d, --policy=<value>            Filter policies to apply by <regex>. Only policies with a name matching the regex will
                                  be applied.
  -f, --fix                       Fix errors if possible.
  -p, --path=<value>              Filter file paths by <regex>.
      --stdin                     Read list of files from stdin.
```

_See code: [src/commands/check.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/commands/check.ts)_

## `repopo list`

Lists the policies configured to run.

```
USAGE
  $ repopo list [-D <value>... | -d <value>] [-p <value>]

FLAGS
  -D, --excludePolicy=<value>...  Exclude policies by name. Can be specified multiple times to exclude multiple
                                  policies.
  -d, --policy=<value>            Filter policies to apply by <regex>. Only policies with a name matching the regex will
                                  be applied.
  -p, --path=<value>              Filter file paths by <regex>.
```

_See code: [src/commands/list.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/commands/list.ts)_
<!-- commandsstop -->
