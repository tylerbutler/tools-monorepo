import { makePolicy, type RepopoConfig } from "repopo";
import {
	NoJsFileExtensions,
	NoPrivateWorkspaceDependencies,
	PackageJsonProperties,
	PackageJsonRepoDirectoryProperty,
	PackageJsonSorted,
	PackageScripts,
} from "repopo/policies";
import { SortTsconfigsPolicy } from "sort-tsconfig";

const config: RepopoConfig = {
	excludeFiles: ["test/data", "fixtures", "config/package.json"],
	policies: [
		makePolicy(NoJsFileExtensions, undefined, {
			excludeFiles: [
				".*/bin/.*js",
				".lighthouserc.js",
				"svelte.config.js",
				"tailwind.config.js",
				// Exclude esm/dist/coverage output in example packages (bundled by Vite, not consumed as npm packages)
				"packages/levee-example/esm/.*js",
				"packages/levee-example/dist/.*js",
				"packages/levee-example/coverage/.*js",
				"packages/levee-presence-tracker/esm/.*js",
				"packages/levee-presence-tracker/dist/.*js",
				"packages/levee-presence-tracker/coverage/.*js",
			],
		}),
		makePolicy(PackageJsonProperties, {
			verbatim: {
				license: "MIT",
				author: "Tyler Butler <tyler@tylerbutler.com>",
				bugs: "https://github.com/tylerbutler/tools-monorepo/issues",
				repository: {
					type: "git",
					url: "git+https://github.com/tylerbutler/tools-monorepo.git",
				},
			},
		}),
		makePolicy(PackageJsonRepoDirectoryProperty),
		makePolicy(PackageJsonSorted),
		makePolicy(
			PackageScripts,
			{
				must: ["clean", "release:license"],
				mutuallyExclusive: [["test:unit", "test:vitest"]],
				conditionalRequired: [
					{
						ifPresent: "test",
						requires: [{ "test:coverage": "vitest run --coverage" }],
					},
				],
			},
			{
				excludeFiles: ["packages/.*-docs/package.json"],
			},
		),
		makePolicy(SortTsconfigsPolicy),
		makePolicy(NoPrivateWorkspaceDependencies),
	],
};

export default config;
