import { resolve } from "pathe";
import type { PolicyShape } from "../policy.js";
import {
	defineGleamPolicy,
	type GleamToml,
} from "../policyDefiners/defineGleamPolicy.js";
import { validateLicenceField } from "../policyDefiners/spdxValidator.js";

/**
 * Configuration for the GleamLicenceConfigured policy.
 *
 * @alpha
 */
export interface GleamLicenceConfiguredConfig {
	/**
	 * Allowed SPDX licence identifiers. If set, only these are accepted.
	 */
	allowedLicences?: string[];

	/**
	 * If true, validate licence values against the SPDX licence list
	 * using `spdx-correct`. When enabled, typos like "MIIT" are detected
	 * and can be auto-fixed to the correct identifier ("MIT").
	 *
	 * Requires the optional peer dependency `spdx-correct` to be installed.
	 *
	 * @defaultValue false
	 */
	validateSpdx?: boolean;
}

const MANUAL_FIX =
	"Use valid SPDX licence identifiers (e.g., MIT, Apache-2.0, MPL-2.0).";

/**
 * A policy that ensures licence metadata is properly configured in gleam.toml.
 *
 * @alpha
 */
export const GleamLicenceConfigured: PolicyShape<GleamLicenceConfiguredConfig> =
	defineGleamPolicy({
		name: "GleamLicenceConfigured",
		description:
			"Ensures gleam.toml has valid SPDX licence identifiers configured.",
		handler: async (
			toml: GleamToml,
			{ file, root, resolve: shouldResolve, config },
		) => {
			const licences = toml.licences;

			if (!Array.isArray(licences) || licences.length === 0) {
				return {
					error: "Missing or empty licences field in gleam.toml.",
					manualFix:
						'Add licences = ["MIT"] (or appropriate SPDX identifier) to gleam.toml.',
				};
			}

			const result = await validateLicenceField({
				licences: licences as string[],
				allowedLicences: config?.allowedLicences,
				validateSpdx: config?.validateSpdx ?? false,
				shouldResolve,
				filePath: resolve(root, file),
				manualFixMessage: MANUAL_FIX,
			});

			return result ?? true;
		},
	});
