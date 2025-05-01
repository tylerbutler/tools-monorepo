import timers from "node:timers/promises";
import {
	DefaultPolicies,
	generatePackagePolicy,
	PackageJsonSorted,
	type RepopoConfig,
} from "repopo";
import { SortTsconfigsPolicy } from "sort-tsconfig";

const config: RepopoConfig = {
	policies: [
		...DefaultPolicies,
		PackageJsonSorted,
		SortTsconfigsPolicy,
		generatePackagePolicy("SlowTestPolicy", async () => {
			await timers.setTimeout(500);
			return true;
		}),
	],
	excludePoliciesForFiles: {
		NoJsFileExtensions: [".*/bin/.*js"],
	},
	perPolicyConfig: {
		PackageJsonProperties: {
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
	},
};

export default config;
