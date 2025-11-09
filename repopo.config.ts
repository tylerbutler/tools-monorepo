import { generatePackagePolicy, makePolicy, type RepopoConfig } from "repopo";
import {
	NoJsFileExtensions,
	PackageJsonProperties,
	PackageJsonRepoDirectoryProperty,
	PackageJsonSorted,
	PackageScripts,
} from "repopo/policies";
import { SortTsconfigsPolicy } from "sort-tsconfig";

const config: RepopoConfig = {
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
		// Example PackageScripts policy configuration:
		// makePolicy(PackageScripts, {
		// 	must: ["build", "clean"],
		// 	mutuallyExclusive: [
		// 		["test", "test:unit"],  // Either "test" or "test:unit", not both
		// 	],
		// }),
		makePolicy(SortTsconfigsPolicy),
		// makePolicy(
		// 	generatePackagePolicy("SlowTestPolicy", async () => {
		// 		await timers.setTimeout(500);
		// 		return true;
		// 	}),
		// ),
	],
};

export default config;
