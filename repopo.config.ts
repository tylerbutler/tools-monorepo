import type { PolicyConfig } from "repopo";

const config: PolicyConfig = {
	// includeDefaultPolicies: true,
	// policies: [
	// 	DefaultPolicies["no-js-file-extensions"]
	// ],
	// policies: [...DefaultPolicies],
	excludePoliciesForFiles: {
		NoJsFileExtensions: [".*/bin/.*js"],
		// PackageJsonProperties: ["package.json"],
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
