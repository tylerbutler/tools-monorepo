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
	dependencyTypes: [
		"dev",
		"engines",
		// Disabled for now because it removes the sha from the field.
		// "packageManager",
		// Disabled because of interactions with changeset versioning.
		// "peer",
		"prod",
	],
	versionGroups: [
		{
			label: "Use workspace protocol for workspace dependencies",
			dependencies: ["$LOCAL"],
			dependencyTypes: ["dev", "prod"],
			pinVersion: "workspace:^",
		},
		{
			label: "Use * dep for deps on sort-package-json",
			dependencies: ["sort-package-json"],
			dependencyTypes: ["dev", "prod"],
			pinVersion: "*",
			packages: ["**"],
		},
		{
			label: "Prefer lowest version when there's a mismatch",
			dependencies: ["**"],
			packages: ["**"],
			preferVersion: "lowestSemver",
		},
	],
	semverGroups: [
		// Disabled for now because it removes the sha from the field.
		// {
		// 	label: "Use exact ranges for packageManager field",
		// 	range: "",
		// 	dependencyTypes: ["packageManager"],
		// 	packages: ["**"],
		// },
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
			label: "Use tilde range for Fluid Framework packages",
			range: "~",
			dependencies: [
				"@fluidframework/**",
				"@fluid-tools/**",
				"fluid-framework",
			],
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
