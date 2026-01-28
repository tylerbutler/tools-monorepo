// @ts-check

/** @type {import("syncpack").RcFile} */
const config = {
	dependencyGroups: [
		{
			aliasName: "fluidframework",
			dependencies: [
				"@fluidframework/**",
				"!@fluidframework/protocol-definitions",
				"fluid-framework",
			],
		},
		{
			aliasName: "vitest",
			dependencies: ["vitest", "@vitest/**"],
		},
	],
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
	versionGroups: [
		{
			label: "Use >= range for repopo peer dependency in sort-tsconfig",
			dependencies: ["repopo"],
			dependencyTypes: ["peer"],
			packages: ["sort-tsconfig"],
			pinVersion: ">=0.5.0",
		},
		{
			label: "Use workspace protocol for workspace dependencies",
			dependencies: ["$LOCAL"],
			dependencyTypes: ["dev", "prod"],
			pinVersion: "workspace:^",
		},
		{
			label:
				"Use pinned version for sort-package-json in sail (production code)",
			dependencies: ["sort-package-json"],
			dependencyTypes: ["prod"],
			packages: ["@tylerbu/sail"],
			pinVersion: "2.14.0",
		},
		{
			label: "Use * dep for deps on sort-package-json",
			dependencies: ["sort-package-json"],
			dependencyTypes: ["dev", "prod", "peer"],
			pinVersion: "*",
			packages: ["**"],
		},
		{
			label: "Ensure all Fluid Framework packages use consistent versions",
			dependencies: ["fluidframework"],
			packages: ["**"],
			preferVersion: "highestSemver",
		},
		{
			label: "Ensure all vitest packages use consistent versions",
			dependencies: ["vitest"],
			packages: ["**"],
			preferVersion: "highestSemver",
		},
		{
			label: "Prefer highest semver when there's a mismatch",
			dependencies: ["**"],
			packages: ["**"],
			preferVersion: "highestSemver",
		},
	],
	semverGroups: [
		{
			label: "Ignore packageManager field",
			isIgnored: true,
			dependencyTypes: ["packageManager"],
			packages: ["**"],
		},
		{
			label: "Ignore pnpm overrides",
			isIgnored: true,
			dependencyTypes: ["pnpmOverrides"],
			packages: ["**"],
		},
		{
			label: "Ignore GitHub URL dependencies",
			isIgnored: true,
			dependencies: ["base16-tailwind"],
			packages: ["**"],
		},
		{
			label: "Use exact ranges for these deps",
			range: "",
			dependencies: [
				"@biomejs/biome",
				"@typescript/native-preview",
				"nx",
				"sort-package-json",
				"syncpack",
			],
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
				"fluidframework",
				"@fluidframework/protocol-definitions",
				"@fluid-tools/**",
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
