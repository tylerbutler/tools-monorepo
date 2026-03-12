import { resolve } from "pathe";
import type { PolicyShape } from "../policy.js";
import {
	type CargoToml,
	defineCargoPolicy,
} from "../policyDefiners/defineCargoPolicy.js";
import { validateLicenceField } from "../policyDefiners/spdxValidator.js";

/**
 * Configuration for the CargoLicenceValidated policy.
 *
 * @alpha
 */
export interface CargoLicenceValidatedConfig {
	/**
	 * Allowed SPDX licence identifiers. If set, only these are accepted.
	 */
	allowedLicences?: string[];

	/**
	 * If true, validate the licence value against the SPDX licence list
	 * using `spdx-correct`. When enabled, typos like "MIIT" are detected
	 * and can be auto-fixed to the correct identifier ("MIT").
	 *
	 * Requires the optional peer dependency `spdx-correct` to be installed.
	 *
	 * @defaultValue true
	 */
	validateSpdx?: boolean;

	/**
	 * If true, skip workspace-only Cargo.toml files (those without a [package] section).
	 *
	 * @defaultValue true
	 */
	skipWorkspace?: boolean;
}

const MANUAL_FIX =
	"Use a valid SPDX licence identifier (e.g., MIT, Apache-2.0, MPL-2.0).";

/**
 * A policy that validates the `license` field in Cargo.toml against the SPDX
 * licence list. Supports auto-fixing correctable identifiers.
 *
 * @remarks
 * Cargo.toml uses a single `license` string field (not an array like Gleam's
 * `licences`). This policy validates that the value is a recognized SPDX
 * identifier and can auto-fix common mistakes like wrong casing.
 *
 * @alpha
 */
export const CargoLicenceValidated: PolicyShape<CargoLicenceValidatedConfig> =
	defineCargoPolicy({
		name: "CargoLicenceValidated",
		description:
			"Validates that Cargo.toml has a valid SPDX licence identifier.",
		handler: async (
			toml: CargoToml,
			{ file, root, resolve: shouldResolve, config },
		) => {
			const skipWorkspace = config?.skipWorkspace ?? true;
			const pkg = toml.package as Record<string, unknown> | undefined;

			if (!pkg && skipWorkspace) {
				return true;
			}

			const licence = pkg?.license as string | undefined;

			if (!licence || licence.trim() === "") {
				return {
					error: "Missing or empty license field in [package] section.",
					manualFix:
						'Add license = "MIT" (or appropriate SPDX identifier) to [package] in Cargo.toml.',
				};
			}

			const result = await validateLicenceField({
				licences: [licence],
				allowedLicences: config?.allowedLicences,
				validateSpdx: config?.validateSpdx ?? true,
				shouldResolve,
				filePath: resolve(root, file),
				manualFixMessage: MANUAL_FIX,
			});

			return result ?? true;
		},
	});
