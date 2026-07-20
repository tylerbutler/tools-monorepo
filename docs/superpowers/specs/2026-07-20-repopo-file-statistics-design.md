# Repopo File Statistics and Input Normalization

## Issue

Fix [#777](https://github.com/tylerbutler/tools-monorepo/issues/777). No open pull request references the issue or overlaps its file-statistics and input-normalization scope.

## Semantics

Statistics remain file-based:

- `count` is the number of non-empty candidate file paths supplied to `PolicyRunner`.
- `processed` is the number of candidates admitted past global exclusions.
- Excluded files are derived as `count - processed`.

Per-policy exclusions do not exclude a file from the run as a whole. A file is counted as processed once even when no policy matches, every matching policy excludes it, or multiple policy instances handle it.

## Input normalization

Move the duplicated Git/stdin output parsing into a small internal helper. The helper:

- normalizes backslashes to forward slashes;
- splits LF and CRLF line records;
- removes empty records without trimming valid path content.

Both stdin and `git ls-files` output use this helper before invoking `PolicyRunner`.

## Runner changes

`PolicyRunner` increments `count` once for each candidate. It increments `processed` once after the candidate passes global exclusions and before routing it to matching policies. Policy matches and handler executions never alter file counts.

The existing summary format remains unchanged:

`Statistics: N files processed, M excluded, T total`

## Error handling

Input normalization is deterministic and does not suppress Git, stdin, policy, or handler errors. Existing errors continue to propagate through the current command and runner paths.

## Tests

Add focused regression coverage for:

- empty input;
- LF and CRLF trailing newlines;
- empty records in file-list input;
- all candidates globally excluded;
- mixed processed and globally excluded candidates;
- multiple policy instances processing the same file without double-counting it;
- summary output using the corrected counts.

Implementation will follow test-driven development and use the existing Vitest and Nx tasks.
