import { DefaultPolicies, type PolicyConfig, type RepoPolicy } from "repopo";

const customPolicy2: RepoPolicy<{
	customBool2: boolean;
	anotherProp2: number;
	required: boolean;
}> = {
	name: "customHandler",
	match: /.*/,
	handler: async ({ file, resolve }) => {
		return true;
	},
};

const config: PolicyConfig = {
	// includeDefaultPolicies: true,
	// policies: [
	// 	DefaultPolicies["no-js-file-extensions"]
	// ],
	policies: [
		// ...DefaultPolicies,
		// customPolicy,
		customPolicy2,
	],
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
		customPolicy2: {
			anotherProp: "foo",
		},
	},
};

export default config;
