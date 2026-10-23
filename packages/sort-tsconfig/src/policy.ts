import { resolve as resolvePath } from "pathe";
import type { FilePolicyDefinition } from "repopo";
import { isSorted, sortTsconfigFile } from "./api.js";

/** Enforces sorted tsconfig files. @alpha */
export const SortTsconfigsPolicy = {
	name: "SortTsconfigs",
	description:
		"Ensures tsconfig.json files are sorted consistently for better readability and diff clarity.",
	match: /.*\.?tsconfig\.json$/i,
	handler: async ({ file, root, resolve }) => {
		const filePath = resolvePath(root, file);
		if (isSorted(filePath)) {
			return [];
		}
		if (resolve) {
			sortTsconfigFile(filePath, true);
		}
		return [
			{
				message: `${file} is not sorted.`,
				fixStatus: resolve ? "fixed" : "available",
			},
		];
	},
} satisfies FilePolicyDefinition;
