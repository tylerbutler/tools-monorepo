import { isSorted, sortTsconfigFile } from "@tylerbu/cli-api";
import type { PolicyFailure, PolicyFixResult, RepoPolicy } from "../policy.js";

/**
 * A repo policy that checks for JavaScript source files that just use the .js file extension. Such files may be
 * interpreted by node as either CommonJS or ESM based on the `type` field in the nearest package.json file. This
 * can create unexpected behavior for JS files; changing the package.json nearest to one will change how the JS
 * is processed by node. Using explicit file extensions reduces ambiguity and ensures a CJS file isn't suddenly treated
 * like an ESM file.
 */
export const SortTsconfigs: RepoPolicy = {
	name: "SortTsconfigs",
	match: /(^|\/)[^/]+tsconfig\..*\.json$/i,
	// biome-ignore lint/suspicious/useAwait: <explanation>
	handler: async ({ file, config, resolve }) => {
		if (config === undefined) {
			return true;
		}

		const failResult: PolicyFailure = {
			name: SortTsconfigs.name,
			file,
			autoFixable: true,
		};

		if (resolve) {
			sortTsconfigFile(file, true);
			const fixResult: PolicyFixResult = {
				...failResult,
				resolved: true,
			};

			return fixResult;
		}

		return isSorted(file) === true ? true : failResult;
	},
};
