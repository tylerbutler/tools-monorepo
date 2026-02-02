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

// Vendored packages (git subrepo) - exclude from policies that enforce monorepo conventions
const vendoredPackages = ["packages/btree-typescript"];
const vendoredPackageJsons = vendoredPackages.map((p) => `${p}/package.json`);

const config: RepopoConfig = {
	excludeFiles: ["test/data", "fixtures", "config/package.json"],
	policies: [
		makePolicy(NoJsFileExtensions, undefined, {
			excludeFiles: [
				".*/bin/.*js",
				".lighthouserc.js",
				"svelte.config.js",
				"tailwind.config.js",
				...vendoredPackages,
			],
		}),
		makePolicy(
			PackageJsonProperties,
			{
				verbatim: {
					license: "MIT",
					author: "Tyler Butler <tyler@tylerbutler.com>",
					bugs: "https://github.com/tylerbutler/tools-monorepo/issues",
					repository: {
						type: "git",
						url: "git+https://github.com/tylerbutler/tools-monorepo.git",
					},
				},
			},
			{
				excludeFiles: vendoredPackageJsons,
			},
		),
		makePolicy(PackageJsonRepoDirectoryProperty),
		makePolicy(PackageJsonSorted, undefined, {
			excludeFiles: vendoredPackageJsons,
		}),
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
				excludeFiles: [
					"packages/.*-docs/package.json",
					...vendoredPackageJsons,
				],
			},
		),
		makePolicy(SortTsconfigsPolicy),
		makePolicy(NoPrivateWorkspaceDependencies),
	],
};

export default config;
