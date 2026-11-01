# remark-sentence-per-line

Put each sentence on its own line without rewriting the rest of the Markdown.
The package includes a remark writer and synchronous formatting APIs for editor integrations.
It does not read or write files.

```markdown
One sentence wrapped
across two lines. Another sentence!
```

Becomes:

```markdown
One sentence wrapped across two lines.
Another sentence!
```

## Install

```sh
pnpm add remark-sentence-per-line remark
```

## Remark

```typescript
import { remark } from "remark";
import { remarkSentencePerLine } from "remark-sentence-per-line";

const result = await remark()
	.use(remarkSentencePerLine, { locale: "en" })
	.process(markdown);

console.log(String(result));
```

The plugin replaces remark's default writer.
With a bare unified processor, use `remark-parse` followed by this plugin.
Do not add `remark-stringify`, an HTML writer, or plugins that change the AST.
The plugin rejects changed trees and later stringifiers rather than silently losing changes.
It enables GFM and YAML/TOML frontmatter parsing.

## Formatting and text edits

```typescript
import {
	formatMarkdown,
	getMarkdownEdits,
	type SentencePerLineOptions,
} from "remark-sentence-per-line/format";

const options: SentencePerLineOptions = { locale: "en-GB" };
const formatted = formatMarkdown(markdown, options);
const edits = getMarkdownEdits(markdown, options);
```

Both functions are synchronous and have no file-system or editor dependency.
Each edit has `start`, `end`, and `newText`.
Offsets refer to the original string in UTF-16 code units; `end` is exclusive.
Edits are sorted and do not overlap.
An editor can convert them with `document.positionAt()`.
When applying edits to a string one at a time, apply them from last to first.

## Behavior

- Reflow paragraphs, including prose in lists, blockquotes, and footnotes.
- Join existing soft line wraps within a sentence.
- Keep blank lines, hard breaks, same-line whitespace within sentences, line endings, and final-newline status.
- Keep heading syntax, code blocks, HTML blocks, tables, frontmatter, and link definitions unchanged.
- Keep links, images, inline code, and inline HTML intact; reflow text inside emphasis and strikethrough.
- Add the required list indentation or blockquote prefix on new lines.
- Skip edits that would change Markdown structure, such as starting a new heading or list.

## Sentence detection

`locale` is a BCP 47 language tag and defaults to `en`.
English and Japanese use [sentence-splitter](https://github.com/textlint-rule/sentence-splitter), which supplies sentence ranges and English abbreviation rules.
Other locales use the runtime's `Intl.Segmenter` and its available ICU language data.
Malformed locale tags throw a `RangeError`.

Sentence detection is heuristic.
Abbreviations can be ambiguous, and `sentence-splitter` treats paired quotations as a single context rather than splitting every sentence inside a quotation.
Sentences inside protected constructs are not split.
Markdown safety and source preservation take priority when a sentence cannot safely start a new line.

This is a dedicated formatter for CommonMark, GFM, and YAML/TOML frontmatter, not a general AST serializer.
It is not intended for HTML rendering pipelines or MDX.
