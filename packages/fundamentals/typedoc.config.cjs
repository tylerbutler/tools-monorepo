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
	outputFileStrategy: "modules",
	out: "docs",
	// entryModule: "index",
	mergeReadme: true,
};
