import { DefaultPolicies, type RepopoConfig } from "repopo";

// import { EOL as newline } from "node:os";
// const headerText = "HEADER";
// const autoGenText = `${newline}THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY`;

const config: RepopoConfig = {
	policies: [...DefaultPolicies],
	excludePoliciesForFiles: {
		NoJsFileExtensions: [".*/bin/.*js", ".*/svelte.config.js"],
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
