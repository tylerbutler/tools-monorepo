import { existsSync } from "node:fs";
import path from "pathe";
import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition, PolicyFailure } from "../policy.js";

/**
 * Policy settings for the LicenseFileExists repo policy.
 *
 * @alpha
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
 * @alpha
 */
export const LicenseFileExists: PolicyDefinition<LicenseFileExistsSettings> =
	makePolicyDefinition(
		"LicenseFileExists",
		// Match files only in the repository root (no subdirectories)
		/^[^/]+$/,
		async ({ file, root, config }) => {
			// Only process files in the root directory
			const acceptedNames = config?.acceptedNames ?? DEFAULT_LICENSE_NAMES;

			// Check if any of the accepted license files exist in the root
			const hasLicenseFile = acceptedNames.some((name) =>
				existsSync(path.join(root, name)),
			);

			if (hasLicenseFile) {
				return true;
			}

			// Only report the failure once, not for every file in the root
			// We'll use a specific trigger file to avoid duplicate reports
			if (
				file === "package.json" ||
				(file.includes(".") && file.split(".").pop() === "md")
			) {
				const result: PolicyFailure = {
					name: LicenseFileExists.name,
					file: ".", // Report against repository root
					autoFixable: false,
					errorMessage: `No LICENSE file found in repository root. Expected one of: ${acceptedNames.join(", ")}`,
				};

				return result;
			}

			// For other files, don't report (to avoid spam)
			return true;
		},
	);
