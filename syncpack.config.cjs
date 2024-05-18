// @ts-check

/** @type {import("syncpack").RcFile} */
const config = {
	lintFormatting: false,
	customTypes: {
		engines: {
			path: "engines",
			strategy: "versionsByName",
		},
		packageManager: {
			path: "packageManager",
			strategy: "name@version",
		},
	},
	dependencyTypes: ["dev", "engines", "packageManager", "peer", "prod"],
	versionGroups: [
		{
			label: "Use workspace protocol for workspace dependencies",
			dependencies: ["$LOCAL"],
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
			label: "Use >= ranges for these deps",
			range: ">=",
			dependencyTypes: ["engines"],
			dependencies: ["**"],
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
