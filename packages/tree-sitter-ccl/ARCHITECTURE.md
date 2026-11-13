# CCL Tree-sitter Grammar Architecture

## Two-pass parsing

The base grammar parses entries and comments. Indented values are raw
`content_line` nodes inside a `nested_content_block`, whether they contain CCL or
plain text. There is no separate `multiline_value_block` classification.

The injection query captures the complete block, including its children and
leading indentation. An editor can parse that range as another CCL document.
Each injected parser measures its own baseline. This keeps empty values,
comments, and sibling entries at the same level.

```ccl
outer =
  empty =
  next = value
```

The base tree has one `outer` entry. Its injected tree has two sibling entries,
`empty` and `next`. Injection support is required to expose the nested structure;
the base tree alone does not contain those entries.

Plain text remains available in the base tree even if it is not valid CCL when
injected. Injection support and error highlighting depend on the editor.

## Indentation

CCL uses the indentation of the **first key in each document**, not a stack of
Python-style indentation levels:

- Lines at or below that baseline start entries.
- Lines above that baseline continue the current value.
- Blank lines do not change the baseline or close a value.
- Tabs retain the package's convention of eight indentation units.

For a baseline of zero, a decrease from four spaces to two still continues the
same value. The scanner emits `DEDENT` only at the document baseline or EOF.

The hidden `_entry_start` token requires a valid entry boundary. Without this
token, the parser could discard indentation as whitespace and promote a nested
comment or setting to the document root.

## Scanner state

`src/scanner.c` records the baseline, whether it has been established, whether
the parser is at a line start, and whether it is in a raw value block. All four
fields are serialized after every external token. There is no pending-token
queue or indentation stack.

The scanner emits `NEWLINE`, `INDENT`, `DEDENT`, and `_entry_start`. A hidden
error sentinel prevents it from changing state during Tree-sitter error
recovery. Lookahead preserves the indentation of the next entry.

The C filename is required for discovery by Tree-sitter 0.25. The CLI can
compile the scanner directly; no platform-specific compiler commands or
pre-populated parser cache are required. Node's N-API binding remains C++.

## Values, keys, and comments

All entries, including empty-key list items, share the same value rule. A value
can contain inline text, indented continuation, or both. Spaces after `=` do not
prevent a following block.

Keys can span any number of lines before `=`. Slash-prefixed keys are valid;
only the `/` key is recognized as a comment. Comment continuations use the same
baseline as other values and can end at EOF without a final newline.

## Validation

The Tree-sitter corpus covers the base tree. Vitest tests cover the review
regressions, actual injection ranges, query loading, incremental baseline edits,
and loading a native prebuild without a build directory.

```bash
pnpm nx run tree-sitter-ccl:test
pnpm nx run tree-sitter-ccl:check:types
```

## References

- [CCL specification](https://chshersh.com/blog/2025-01-06-the-most-elegant-configuration-language.html)
- [Tree-sitter external scanners](https://tree-sitter.github.io/tree-sitter/creating-parsers/4-external-scanners.html)
