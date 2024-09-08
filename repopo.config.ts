import {
	DefaultPolicies,
	type HandlerConfigMap2,
	type MergeRecords,
	type PerPolicySettings,
	type PolicyConfig,
	type RepoPolicy,
} from "repopo";
import { PackageJsonProperties } from "repopo/policies";

interface customConfig {
	customBool2: boolean;
	anotherProp2: number;
	required: boolean;
}

const customPolicy2: RepoPolicy<customConfig> = {
	name: "customPolicy",
	match: /.*/,
	handler: async ({ file, resolve }) => {
		return true;
	},
};

const policies: RepoPolicy[] = [
	// ...DefaultPolicies,
	// customPolicy,
	PackageJsonProperties,
	customPolicy2,
];

const config: PolicyConfig = {
	// includeDefaultPolicies: true,
	// policies: [
	// 	DefaultPolicies["no-js-file-extensions"]
	// ],
	policies,
	excludePoliciesForFiles: {
		ssd: [".*/bin/.*js"],
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
