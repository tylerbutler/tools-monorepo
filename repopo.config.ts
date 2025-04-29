import { type RepopoConfig, makePolicy } from "repopo";
import {
	NoJsFileExtensions,
	PackageJsonProperties,
	PackageJsonRepoDirectoryProperty,
	PackageJsonSorted,
} from "repopo/policies";
import { SortTsconfigsPolicy } from "sort-tsconfig";

const config: RepopoConfig = {
	policies: [
		makePolicy(NoJsFileExtensions, undefined, {
			excludeFiles: [".*/bin/.*js"],
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
		makePolicy(SortTsconfigsPolicy),
	],
	// excludeFiles: [],
};

export default config;
