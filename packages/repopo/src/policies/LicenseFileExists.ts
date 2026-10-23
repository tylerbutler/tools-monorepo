import { stat } from "node:fs/promises";
import path from "pathe";
import type { RepositoryPolicyDefinition } from "../policy.js";

/**
 * Policy settings for the LicenseFileExists repo policy.
 *
 * @public
 */
export interface LicenseFileExistsSettings {
	/**
	 * Array of acceptable license file names. Defaults to common variations.
	 */
	acceptedNames?: string[];
}

/**
 * Default license file names to check for.
 */
const DEFAULT_LICENSE_NAMES = [
	"LICENSE",
	"LICENSE.txt",
	"LICENSE.md",
	"LICENSE.rst",
	"LICENCE",
	"LICENCE.txt",
	"LICENCE.md",
	"LICENCE.rst",
];

/**
 * A repo policy that checks that a LICENSE file exists in the repository root.
 * This is essential for open source projects to clarify usage rights and obligations.
 *
 * @public
 */
export const LicenseFileExists = {
	name: "LicenseFileExists",
	description:
		"Ensures a LICENSE file exists in the repository root for open source projects.",
	scope: "repository",
	handler: async ({ root, files, config }) => {
		const acceptedNames = config?.acceptedNames ?? DEFAULT_LICENSE_NAMES;

		// Check if any of the accepted license files exist in the root
		for (const name of acceptedNames) {
			if (!files.includes(name)) {
				continue;
			}
			try {
				if ((await stat(path.join(root, name))).isFile()) {
					return [];
				}
			} catch (error: unknown) {
				if (
					!(
						error instanceof Error &&
						"code" in error &&
						error.code === "ENOENT"
					)
				) {
					throw error;
				}
			}
		}

		return [
			{
				message: `No LICENSE file found in repository root. Expected one of: ${acceptedNames.join(", ")}`,
			},
		];
	},
} satisfies RepositoryPolicyDefinition<LicenseFileExistsSettings>;
