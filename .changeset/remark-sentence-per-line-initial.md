---
"remark-sentence-per-line": minor
---

Add a Markdown formatter that puts each sentence on its own line without rewriting the rest of the document.
Keep code, tables, frontmatter, hard breaks, and original Markdown syntax intact.

Use the remark plugin to format documents, or the synchronous `formatMarkdown` and `getMarkdownEdits` APIs for editor integrations.
Configure the sentence-detection locale as needed; text-edit offsets use UTF-16 code units.

Use the plugin as a dedicated formatter, not with plugins that change the Markdown tree or replace its writer.
