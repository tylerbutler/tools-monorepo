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
