// @ts-check

/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
	entryPoints: [
		"./src/index.ts",
		"./src/array.ts",
		"./src/git.ts",
		"./src/set.ts",
	],
	plugin: ["typedoc-plugin-markdown"],
	sourceLinkTemplate:
		"https://github.com/tylerbutler/tools-monorepo/blob/main/{path}#L{line}",
	outputFileStrategy: "modules",
	out: "docs",
	// entryModule: "index",
	mergeReadme: true,
};
