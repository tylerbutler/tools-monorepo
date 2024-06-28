// import remarkPresetLintConsistent from "remark-preset-lint-consistent";
// import remarkPresetLintRecommended from "remark-preset-lint-recommended";
import remarkToc from "remark-toc";
import remarkGfm from "remark-gfm";

const remarkConfig = {
	settings: {
		bullet: "-",
		// See <https://github.com/remarkjs/remark/tree/main/packages/remark-stringify> for more options.
	},
	plugins: [
		// remarkPresetLintConsistent, // Check that markdown is consistent.
		// remarkPresetLintRecommended, // Few recommended rules.
		[remarkGfm],
		["remark-lint-list-item-indent", "tab"],
		["remark-lint-emphasis-marker", "_"],
		["remark-lint-strong-marker", "*"],
		[
			// Generate a table of contents in `## Contents`
			(remarkToc, { heading: "contents" }),
		],
	],
};

export default remarkConfig;
