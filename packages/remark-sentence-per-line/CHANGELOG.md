# remark-sentence-per-line

## 0.1.0

### Minor Changes

- Add a Markdown formatter that puts each sentence on its own line without rewriting the rest of the document. _[`#816`](https://github.com/tylerbutler/tools-monorepo/pull/816) [`797ce5c`](https://github.com/tylerbutler/tools-monorepo/commit/797ce5cd12fce047b9b6b51dae8905575dc83481) [@tylerbutler](https://github.com/tylerbutler)_

	Keep code, tables, frontmatter, hard breaks, and original Markdown syntax intact.
	
	Use the remark plugin to format documents, or the synchronous `formatMarkdown` and `getMarkdownEdits` APIs for editor integrations.
	Configure the sentence-detection locale as needed; text-edit offsets use UTF-16 code units.
	
	Use the plugin as a dedicated formatter, not with plugins that change the Markdown tree or replace its writer.
