# Tree-sitter CCL Development

## Build and test

Run these commands from the monorepo root:

```bash
corepack enable
pnpm install --ignore-scripts
pnpm nx run tree-sitter-ccl:build
pnpm nx run tree-sitter-ccl:test
pnpm nx run tree-sitter-ccl:check:types
```

The build regenerates the parser, builds the Node binding, and refreshes native
prebuilds. Nx runs that build before the Vitest tests, then runs the Tree-sitter
corpus. Running `pnpm test` inside this package runs only the native corpus.

For a CLI-only build, run `pnpm run build:cli` in this directory. Tree-sitter
discovers `src/scanner.c` on all supported platforms; no cache setup is needed.

## Parser changes

- Edit `grammar.js` and `src/scanner.c`, then regenerate with
  `pnpm exec tree-sitter generate`.
- Keep the generated files in `src/` with the source changes.
- Add base-tree cases to `test/corpus/` and injection or incremental cases to
  `test/parser.test.ts`.
- Treat a decrease that stays above the document baseline as value content.
- Preserve all scanner state across serialization, including the baseline of
  injected documents.

The grammar filename has a repository policy exception because Tree-sitter
requires `grammar.js`. The scanner is C; only the Node binding needs C++20.
The Node entry point and declarations use `.cjs` and `.d.cts`.

## Native bindings

The Node loader uses `node-gyp-build` to select a local build or compatible
prebuild. Package archives include `binding.gyp` and native sources so installs
can compile when no prebuild matches.

```bash
pnpm pack --pack-destination ./_temp
cargo test
```

Use a Rust toolchain supported by the resolved dependencies. The Rust test and
documentation example both pass a borrowed language to Tree-sitter 0.25.

## Debugging

```bash
pnpm exec tree-sitter test --debug-build --rebuild
pnpm exec tree-sitter parse --debug sample.ccl
```

Multiline comments may end at EOF without a final newline. Nested content uses
the two-pass injection model described in [ARCHITECTURE.md](ARCHITECTURE.md).
Base-tree output alone does not show the injected entries.

The native corpus has no coverage command, so this package retains its
repository coverage-policy exception. Run `pnpm run release:license` to
generate the third-party license file.
