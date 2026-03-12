import type { PolicyShape } from "../policy.js";
import {
	defineGleamPolicy,
	type GleamToml,
} from "../policyDefiners/defineGleamPolicy.js";

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
	 * If true, validate that values look like SPDX identifiers.
	 * @defaultValue true
	 */
	requireSpdx?: boolean;
}

const COMMON_SPDX = new Set([
	"MIT",
	"Apache-2.0",
	"GPL-2.0-only",
	"GPL-2.0-or-later",
	"GPL-3.0-only",
	"GPL-3.0-or-later",
	"LGPL-2.1-only",
	"LGPL-2.1-or-later",
	"LGPL-3.0-only",
	"LGPL-3.0-or-later",
	"BSD-2-Clause",
	"BSD-3-Clause",
	"ISC",
	"MPL-2.0",
	"AGPL-3.0-only",
	"AGPL-3.0-or-later",
	"Unlicense",
	"CC0-1.0",
	"0BSD",
	"EUPL-1.2",
	"Artistic-2.0",
	"Zlib",
	"BSL-1.0",
]);

// Simple SPDX-like pattern: letters, digits, hyphens, dots
const SPDX_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.\-+]*$/;

function validateLicences(
	licences: string[],
	allowedLicences: string[] | undefined,
	requireSpdx: boolean,
): string[] {
	const errors: string[] = [];

	for (const licence of licences) {
		if (allowedLicences && !allowedLicences.includes(licence)) {
			errors.push(
				`Licence "${licence}" is not in the allowed list: ${allowedLicences.join(", ")}`,
			);
		} else if (requireSpdx && !SPDX_PATTERN.test(licence)) {
			errors.push(
				`Licence "${licence}" does not look like a valid SPDX identifier`,
			);
		}
	}

	return errors;
}

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
		handler: async (toml: GleamToml, { config }) => {
			const licences = toml.licences as string[] | undefined;

			if (!(licences && Array.isArray(licences)) || licences.length === 0) {
				return {
					error: "Missing or empty licences field in gleam.toml.",
					manualFix:
						'Add licences = ["MIT"] (or appropriate SPDX identifier) to gleam.toml.',
				};
			}

			const requireSpdx = config?.requireSpdx ?? true;
			const errors = validateLicences(
				licences,
				config?.allowedLicences,
				requireSpdx,
			);

			if (errors.length > 0) {
				return {
					error: errors.join("; "),
					manualFix:
						"Use valid SPDX licence identifiers (e.g., MIT, Apache-2.0, MPL-2.0).",
				};
			}

			return true;
		},
	});

// Re-export for potential use in other policies
export { COMMON_SPDX };
