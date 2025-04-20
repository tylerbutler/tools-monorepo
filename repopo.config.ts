import { DefaultPolicies, PackageJsonSorted, type RepopoConfig } from "repopo";
import { SortTsconfigsPolicy } from "sort-tsconfig";

const config: RepopoConfig = {
	policies: [...DefaultPolicies, PackageJsonSorted, SortTsconfigsPolicy],
	excludePoliciesForFiles: {
		NoJsFileExtensions: [".*/bin/.*js", ".*/svelte.config.js"],
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
