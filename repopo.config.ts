import { PackageJsonProperties, PackageJsonSorted, defineConfig } from "repopo";
import { SortTsconfigsPolicy } from "sort-tsconfig";

const policies = [
	PackageJsonProperties,
	PackageJsonSorted,
	SortTsconfigsPolicy,
] as const;

const config = defineConfig<typeof policies>(policies, {
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
		SortTsconfigsPolicy: {
			order: ["1", "2"],
		},
	},
});

export default config;
