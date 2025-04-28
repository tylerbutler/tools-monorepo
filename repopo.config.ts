import { DefaultPolicies, PackageJsonSorted, type RepopoConfig, type PolicyList, NoJsFileExtensions } from "repopo";
import { SortTsconfigsPolicy } from "sort-tsconfig";

const policies: PolicyList = [
	NoJsFileExtensions
]

const config: RepopoConfig = {
	policies: [...DefaultPolicies, PackageJsonSorted, SortTsconfigsPolicy],
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
