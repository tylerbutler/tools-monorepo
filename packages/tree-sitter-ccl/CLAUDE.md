# Tree-sitter CCL Agent Guide

## Components

- `grammar.js`: grammar source; its filename has a repository policy exception.
- `src/scanner.c`: C external scanner, discovered directly by Tree-sitter 0.25.
- `src/parser.c`, `src/grammar.json`, `src/node-types.json`: generated output.
- `queries/`: highlighting and whole-block CCL injections.
- `bindings/node/`: C++ N-API binding, CommonJS loader, and `.d.cts` declarations.
- `bindings/rust/`: Rust binding and build script.
- `test/corpus/`: Tree-sitter base-tree tests.
- `test/*.test.ts`: Vitest regressions, injections, and Node loading tests.

## Commands

From the workspace root:

```bash
pnpm nx run tree-sitter-ccl:build
pnpm nx run tree-sitter-ccl:test
pnpm nx run tree-sitter-ccl:check:types
pnpm nx run tree-sitter-ccl:ci
```

From this package:

```bash
pnpm exec tree-sitter generate
pnpm exec tree-sitter test --rebuild
pnpm exec tree-sitter parse sample.ccl
pnpm run build:cli
cargo test
```

Nx builds the native module before running Vitest. The package's `test` script
alone runs only the Tree-sitter corpus.
The package's `ci` target includes the corpus, Vitest, type checks, and Rust tests
and is selected by the workspace's affected CI commands.

## Required invariants

CCL uses the indentation of the first key as the document baseline. Lines above
that baseline continue a value, even if their indentation decreases. Lines at or
below it start entries. Blank lines do not close blocks.

Keep `_entry_start` scanner-gated: indented lines must not become root entries
merely because whitespace is an extra. Each injected document establishes its
own baseline, including ranges that start at nonzero columns.

The base grammar keeps nested values as raw content. Injection queries capture
the entire block with its children and indentation. Plain text uses the same
raw block representation; do not add a competing plain-text grammar branch.

All keys, including empty list keys, use the same value rule. Inline values can
have indented continuations. Keys may span more than two lines; only the `/` key
is a comment. Comment continuations need no final newline.

Serialize and restore all scanner state. The scanner has a baseline and a block
flag, not an indentation stack or pending DEDENT queue. Use `mark_end` so
lookahead does not consume the following entry's indentation.

## Validation

Regenerate parser output after grammar changes. Check both base trees and
injected trees when changing nesting, and compare incremental parses with fresh
parses when changing scanner state. Include EOF and LF/CRLF cases.

The Node package must load from prebuilds without a `build/` directory and must
include the sources needed for a fallback build. Its public export is a language
object, not a `language()` function.

See [ARCHITECTURE.md](ARCHITECTURE.md) and [DEV.md](DEV.md) for details.
