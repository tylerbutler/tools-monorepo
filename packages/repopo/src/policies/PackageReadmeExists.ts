import { existsSync } from "node:fs";
import path from "pathe";
import type { PolicyDefinition, PolicyFailure } from "../policy.js";
import { PackageJsonRegexMatch } from "./constants.js";

/**
 * A repo policy that checks that each package.json has an accompanying README.md.
 *
 * @alpha
 */
export const PackageReadmeExists: PolicyDefinition = {
	name: "PackageReadmeExists",
	match: PackageJsonRegexMatch,
	handler: async ({ file, root }) => {
		// Check if a README.md file exists alongside the package.json
		if (
			!existsSync(
				path.join(path.dirname(path.resolve(root, file)), "README.md"),
			)
		) {
			return {
				name: PackageReadmeExists.name,
				file,
				autoFixable: false,
				errorMessage: `No README.md found alongside ${file}`,
			} satisfies PolicyFailure;
		}

		return true;
	},
};
