# tree-sitter-ccl

Tree-sitter grammar for [CCL (Categorical Configuration Language)](https://chshersh.com/blog/2025-01-06-the-most-elegant-configuration-language.html).

## Supported syntax

- Key-value assignments and empty-key list items.
- Empty values, inline values, and indented continuations.
- Keys spanning multiple lines, including slash-prefixed keys.
- Comments with the `/` key, written as `/= text` or `/ = text`.
- Multiline comments, including a last line without a trailing newline.
- Nested CCL through whole-block language injections.
- LF and CRLF line endings.

```ccl
/= Application settings
name = MyApp
description = First line
  Further description

database =
  /= Connection settings
  host = localhost
  optional =
  port = 5432

features =
  = authentication
  = logging

/path = /var/lib/myapp

long
key
name = value
```

## Indentation and nested content

The first key establishes the document's indentation baseline. Lines with more
indentation continue the current value; lines at or below that baseline start
new entries. Blank lines do not close a value. Tabs count as eight indentation
units.

The base parser keeps indented values as raw `content_line` nodes inside a
`nested_content_block`. This supports both CCL and plain text without guessing
which kind of value the application expects.

Editors that support `queries/injections.scm` can parse each complete block as
another CCL document. That parse establishes its own baseline. An empty nested
value therefore does not absorb its next sibling:

```ccl
outer =
  empty =
  next = value
```

The base tree has one entry; the injected tree has two sibling entries. Tools
without injection support retain the raw value but do not expose its nested
entries. Editor support and highlighting of non-CCL text in injected ranges vary.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the scanner and injection design.

## Build from this monorepo

The package is currently private. Use a local build or install a package archive.

Requirements:

- Node.js 22.22 or later for this workspace, with pnpm enabled through Corepack.
- A C compiler for the parser and scanner.
- A C++20 compiler and Python 3 for the Node N-API binding.
- A supported Rust toolchain when using the Rust binding.

From the repository root:

```bash
corepack enable
pnpm install --ignore-scripts
pnpm nx run tree-sitter-ccl:build
pnpm nx run tree-sitter-ccl:test
pnpm nx run tree-sitter-ccl:check:types
```

The build regenerates the parser and native prebuilds before building the local
Node module. The Node loader selects either a local build or a compatible
prebuild through `node-gyp-build`. Package archives also include `binding.gyp`
and the native sources for platforms without a matching prebuild.

To create an archive, run `pnpm pack --pack-destination ./_temp` in this package.
Install that archive in another project with `pnpm add /path/to/archive.tgz`.

## Node.js

Install `tree-sitter` alongside the grammar, then pass the exported object
directly to `setLanguage`. The export is not a `language()` function.

```typescript
import Parser from "tree-sitter";
import CCL from "tree-sitter-ccl";

const parser = new Parser();
parser.setLanguage(CCL);
const tree = parser.parse("name = value\n");
console.log(tree.rootNode.toString());
```

CommonJS consumers can use `require("tree-sitter-ccl")`. The `.d.cts`
declarations describe the same CommonJS language object.

Grammar and query paths remain available for editor integrations:

```javascript
const grammarPath = require.resolve("tree-sitter-ccl/grammar.js");
const highlightsPath = require.resolve("tree-sitter-ccl/queries/highlights.scm");
const injectionsPath = require.resolve("tree-sitter-ccl/queries/injections.scm");
```

## Rust

```rust
let mut parser = tree_sitter::Parser::new();
parser
    .set_language(&tree_sitter_ccl::language())
    .expect("Error loading CCL grammar");
let tree = parser.parse("name = value\n", None).unwrap();
```

Run `cargo test` from this package to check the Rust binding and its example.

## CLI and development

From this package:

```bash
pnpm exec tree-sitter generate
pnpm run build:cli
pnpm exec tree-sitter parse sample.ccl
pnpm exec tree-sitter test --rebuild
```

Tree-sitter discovers `src/scanner.c` directly. No platform-specific build script
or pre-populated parser cache is required. `pnpm run build-wasm` uses Tree-sitter's
Wasm build support and requires Emscripten or a supported container runtime.

The corpus tests check base trees. Vitest checks continuations, comments,
injection ranges, incremental edits, and native prebuild loading. Nx runs both;
the package's `pnpm test` command alone runs the native corpus.

See [DEV.md](DEV.md) for development and debugging commands.

## License

MIT. See [LICENSE](LICENSE).
