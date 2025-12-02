import type { PolicyDefinition, PolicyFailure, PolicyFixResult } from "repopo";
import { isSorted, sortTsconfigFile } from "sort-tsconfig";

/**
 * A repo policy that checks that tsconfig files are sorted according to settings.
 *
 * @alpha
 */
export const SortTsconfigsPolicy: PolicyDefinition = {
	name: "SortTsconfigs",
	match: /.*\.?tsconfig\.json$/i,
	handler: async ({ file, config, resolve }) => {
		if (config === undefined) {
			return true;
		}

		const failResult: PolicyFailure = {
			name: SortTsconfigsPolicy.name,
			file,
			autoFixable: true,
			errorMessages: [],
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
