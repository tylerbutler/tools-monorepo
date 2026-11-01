import type { Root } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import type { Compiler, Plugin } from "unified";
import { formatMarkdown, type SentencePerLineOptions } from "./format.js";

function sourceTree(tree: unknown): string {
	return JSON.stringify(tree, (key: string, value: unknown) =>
		key === "data" ? undefined : value,
	);
}

/**
 * Install a source-preserving Markdown writer.
 * Use after parsing plugins, instead of a Markdown or HTML stringifier.
 */
export const remarkSentencePerLine: Plugin<[SentencePerLineOptions?], Root> =
	function remarkSentencePerLine(options = {}) {
		this.use(remarkGfm).use(remarkFrontmatter, ["yaml", "toml"]);
		const compiler: Compiler = (tree, file) => {
			const source = file.toString();
			if (sourceTree(tree) !== sourceTree(this.parse(source))) {
				throw new Error(
					"remark-sentence-per-line cannot write a changed AST. Use a separate formatting pipeline.",
				);
			}
			return formatMarkdown(source, options);
		};
		this.compiler = compiler;
		return () => {
			if (this.compiler !== compiler) {
				throw new Error(
					"remark-sentence-per-line must be the final writer. Remove the later stringifier.",
				);
			}
		};
	};
