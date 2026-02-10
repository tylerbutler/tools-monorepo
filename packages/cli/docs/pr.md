`tbu pr`
========

GitHub pull request metrics collection and reporting.

* [`tbu pr collect REPO`](#tbu-pr-collect-repo)
* [`tbu pr report`](#tbu-pr-report)

## `tbu pr collect REPO`

Collect GitHub PR data to JSON Lines files.

```
USAGE
  $ tbu pr collect REPO [-v | --quiet] [-o <value>] [-s <value>]

ARGUMENTS
  REPO  GitHub repository in owner/repo format.

FLAGS
  -o, --output=<value>  [default: pr-data] Output directory for JSON Lines files.
  -s, --since=<value>   Only collect PRs created after this date (YYYY-MM-DD). PRs are fetched in reverse chronological
                        order, so collection stops when a PR older than this date is encountered.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Collect GitHub PR data to JSON Lines files.

  Collects pull request metadata, reviews, and comments from a GitHub repository using the GitHub GraphQL API. Data is
  written to JSON Lines files that can be queried with DuckDB.

  Requires the GitHub CLI (gh) to be installed and authenticated.

  Output files:
  prs.jsonl              PR metadata (number, title, author, dates, etc.)
  reviews.jsonl          Code reviews (reviewer, state, timestamp)
  review_comments.jsonl  Inline code comments
  pr_comments.jsonl      Issue-style PR comments

EXAMPLES
  Collect all PR data from FluidFramework repo

    $ tbu pr collect microsoft/FluidFramework

  Collect to a custom output directory

    $ tbu pr collect microsoft/FluidFramework -o fluid-prs

  Only collect PRs created after a specific date

    $ tbu pr collect microsoft/FluidFramework --since 2024-01-01
```

_See code: [src/commands/pr/collect.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli/src/commands/pr/collect.ts)_

## `tbu pr report`

Generate contributor metrics report from collected PR data.

```
USAGE
  $ tbu pr report -s <value> -e <value> [-v | --quiet] [-d <value>] [--csv]

FLAGS
  -d, --data=<value>   [default: pr-data] Data directory containing JSON Lines files.
  -e, --end=<value>    (required) End date (YYYY-MM-DD).
  -s, --start=<value>  (required) Start date (YYYY-MM-DD).
      --csv            Output as CSV format.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Generate contributor metrics report from collected PR data.

  Generates a contributor metrics report from PR data collected with 'pr collect'. Uses DuckDB to query the JSON Lines
  files and produce a summary of PR activity.

  Requires DuckDB to be installed (brew install duckdb).

  Report includes:
  - PRs opened per contributor
  - PRs merged per contributor
  - PRs reviewed per contributor
  - Reviews given per contributor
  - Review comments given per contributor
  - Average PR duration (time from open to merge)
  - Average time to first review

EXAMPLES
  Generate report for January 2024

    $ tbu pr report --start 2024-01-01 --end 2024-01-31

  Export report as CSV

    $ tbu pr report -s 2024-01-01 -e 2024-01-14 --csv > report.csv

  Use a custom data directory

    $ tbu pr report -s 2024-01-01 -e 2024-01-14 --data /path/to/data
```

_See code: [src/commands/pr/report.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli/src/commands/pr/report.ts)_
