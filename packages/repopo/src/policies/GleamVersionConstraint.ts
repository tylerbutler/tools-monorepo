import type { PolicyShape } from "../policy.js";
import {
	defineGleamPolicy,
	type GleamToml,
} from "../policyDefiners/defineGleamPolicy.js";

/**
 * Configuration for the GleamVersionConstraint policy.
 *
 * @alpha
 */
export interface GleamVersionConstraintConfig {
	/**
	 * Minimum Gleam compiler version to require (e.g., "1.0.0").
	 * If set, the constraint must specify at least this version.
	 */
	minimumVersion?: string;
}

const SEMVER_PREFIX_REGEX = /^[><=~^!\s]+/;

/**
 * Parse a simple semver string into comparable parts.
 */
function parseSemver(version: string): [number, number, number] | undefined {
	const cleaned = version.replace(SEMVER_PREFIX_REGEX, "").trim();
	const parts = cleaned.split(".");
	if (parts.length < 2) {
		return undefined;
	}
	const major = Number.parseInt(parts[0] ?? "0", 10);
	const minor = Number.parseInt(parts[1] ?? "0", 10);
	const patch = Number.parseInt(parts[2] ?? "0", 10);
	if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
		return undefined;
	}
	return [major, minor, patch];
}

function isVersionAtLeast(constraint: string, minimum: string): boolean {
	const constraintParts = parseSemver(constraint);
	const minimumParts = parseSemver(minimum);
	if (!(constraintParts && minimumParts)) {
		return false;
	}
	for (let i = 0; i < 3; i++) {
		const c = constraintParts[i] ?? 0;
		const m = minimumParts[i] ?? 0;
		if (c > m) {
			return true;
		}
		if (c < m) {
			return false;
		}
	}
	return true;
}

/**
 * A policy that ensures the Gleam compiler version constraint is set in gleam.toml.
 *
 * @alpha
 */
export const GleamVersionConstraint: PolicyShape<GleamVersionConstraintConfig> =
	defineGleamPolicy({
		name: "GleamVersionConstraint",
		description:
			"Ensures gleam.toml has a Gleam compiler version constraint to prevent incompatible builds.",
		handler: async (toml: GleamToml, { config }) => {
			const gleamVersion = toml.gleam as string | undefined;

			if (gleamVersion === undefined || gleamVersion === "") {
				return {
					error: "Missing gleam version constraint in gleam.toml.",
					manualFix:
						'Add gleam = ">= 1.0.0" (or appropriate version) to gleam.toml.',
				};
			}

			if (
				config?.minimumVersion &&
				!isVersionAtLeast(gleamVersion, config.minimumVersion)
			) {
				return {
					error: `Gleam version constraint "${gleamVersion}" is below minimum "${config.minimumVersion}".`,
					manualFix: `Update to gleam = ">= ${config.minimumVersion}" or higher.`,
				};
			}

			return true;
		},
	});
