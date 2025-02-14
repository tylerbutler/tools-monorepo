import { DefaultPolicies, type PolicyConfig } from "repopo";

const config: PolicyConfig = {
	policies: [...DefaultPolicies],
	excludePoliciesForFiles: {
		NoJsFileExtensions: [".*/bin/.*js"],
	},
	policySettings: {
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
