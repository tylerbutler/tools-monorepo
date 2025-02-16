import { DefaultPolicies, type RepopoConfig } from "repopo";

const config: RepopoConfig = {
	policies: [...DefaultPolicies],
	excludePoliciesForFiles: {
		NoJsFileExtensions: [".*/bin/.*js"],
	},
	perPolicyConfig: {
		PackageJsonProperties: {
			verbatim: {
				license: "MIT",
				author: "Tyler Butler <tyler@tylerbutler.com>",
				bugs: "https://github.com/tylerbutler/tools-monorepo/issues",
			},
		},
	},
};

export default config;
