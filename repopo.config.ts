import {
	NoJsFileExtensions,
	PackageJsonProperties,
	PackageJsonSorted,
	type RepopoConfig,
	makePolicy,
} from "repopo";
import { SortTsconfigsPolicy } from "sort-tsconfig";

const config: RepopoConfig = {
	policies: [
		makePolicy(SortTsconfigsPolicy),
		makePolicy(PackageJsonSorted),
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
	],
	// excludeFiles: [],
};

export default config;
