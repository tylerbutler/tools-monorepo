import { type PolicyConfig, type RepoPolicy, defineConfig } from "repopo";
import {
	PackageJsonProperties,
	PackageJsonSortedPolicy,
	SortTsconfigs,
} from "repopo/policies";

interface customConfig {
	customBool2: boolean;
	anotherProp2: number;
	required: boolean;
}

const customPolicy2 = {
	name: "customPolicy2",
	match: /.*/,
	handler: async ({ file, resolve }) => {
		return true;
	},
} as const satisfies RepoPolicy<customConfig | undefined>;

const config = defineConfig({
	// includeDefaultPolicies: true,
	// policies: [
	// 	DefaultPolicies["no-js-file-extensions"]
	// ],
	policies: [
		PackageJsonProperties,
		customPolicy2,
		SortTsconfigs,
		PackageJsonSortedPolicy,
	],
	excludePoliciesForFiles: {
		PackageJsonProperties: [".*/bin/.*js"],
		// PackageJsonProperties: ["package.json"],
	},
	perPolicyConfig: {
		customPolicy2: {
			customBool2: true,
		},
		PackageJsonProperties: {
			verbatim: {
				license: "MIT",
				author: "Tyler Butler <tyler@tylerbutler.com>",
				bugs: "https://github.com/tylerbutler/tools-monorepo/issues",
			},
		},
		// customPolicy2: {
		// 	anotherProp2: 1,
		// },
	},
});

export default config;
