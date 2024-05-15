// @ts-check

/** @type {import("syncpack").RcFile} */
const config = {
	lintFormatting: false,
	versionGroups: [
		{
			label: "Use workspace protocol for workspace dependencies",
			dependencies: ["@tylerbu/*"],
			dependencyTypes: ["dev", "prod"],
			pinVersion: "workspace:^",
		},
	],
	semverGroups: [
		{
			label: "Use exact ranges for these deps",
			range: "",
			dependencies: ["@biomejs/biome", "nx", "sort-package-json"],
			packages: ["**"],
		},
		{
			label: "Use tilde range for TypeScript",
			range: "~",
			dependencies: ["typescript"],
			packages: ["**"],
		},
		{
			label: "Use caret range by default",
			range: "^",
			dependencies: ["**"],
			packages: ["**"],
		},
	],
};

module.exports = config;
