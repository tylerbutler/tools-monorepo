import { isSorted, sortTsconfigFile } from "@tylerbu/cli-api";
import type { PolicyFailure, PolicyFixResult, RepoPolicy } from "../policy.js";

/**
 * A repo policy that checks that tsconfig files are sorted. Includes an auto-fixer that will sort the files if needed.
 */
export const SortTsconfigs = {
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
} as const satisfies RepoPolicy;
