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
	gitRevision: "main",
	sourceLinkTemplate:
		"https://github.com/tylerbutler/tools-monorepo/blob/{gitRevision}/{path}#L{line}",
	outputFileStrategy: "modules",
	out: "docs",
	// entryModule: "index",
	readme: "./README.md",
	mergeReadme: true,
};
