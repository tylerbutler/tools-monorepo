import type { PolicyShape } from "../policy.js";
import {
	defineGleamPolicy,
	type GleamToml,
} from "../policyDefiners/defineGleamPolicy.js";

/**
 * Configuration for the GleamDepVersions policy.
 *
 * @alpha
 */
export interface GleamDepVersionsConfig {
	/**
	 * If true, require all dependencies to have version constraints.
	 * @defaultValue true
	 */
	requireVersions?: boolean;

	/**
	 * If true, warn on unbounded version ranges (e.g., ">= 1.0.0" without upper bound).
	 * @defaultValue false
	 */
	warnUnbounded?: boolean;
}

function extractVersion(dep: unknown): string | undefined {
	if (typeof dep === "string") {
		return dep;
	}
	if (typeof dep === "object" && dep !== null) {
		const record = dep as Record<string, unknown>;
		if (typeof record.version === "string") {
			return record.version;
		}
		// Path-only dependencies don't need version checks
		if (typeof record.path === "string") {
			return undefined;
		}
	}
	return undefined;
}

function checkSection(
	sectionName: string,
	deps: Record<string, unknown>,
	requireVersions: boolean,
	warnUnbounded: boolean,
): string[] {
	const errors: string[] = [];
	for (const [name, value] of Object.entries(deps)) {
		const version = extractVersion(value);

		if (requireVersions && version === undefined) {
			// Skip path dependencies
			if (
				typeof value === "object" &&
				value !== null &&
				typeof (value as Record<string, unknown>).path === "string"
			) {
				continue;
			}
			errors.push(`[${sectionName}] "${name}" has no version constraint`);
		}

		if (warnUnbounded && version !== undefined && version.startsWith(">=")) {
			errors.push(
				`[${sectionName}] "${name}" = "${version}" uses an unbounded version range`,
			);
		}
	}
	return errors;
}

/**
 * A policy that prevents missing or overly loose version constraints in Gleam dependencies.
 *
 * @alpha
 */
export const GleamDepVersions: PolicyShape<GleamDepVersionsConfig> =
	defineGleamPolicy({
		name: "GleamDepVersions",
		description:
			"Prevents missing or overly loose version constraints in gleam.toml dependencies.",
		handler: async (toml: GleamToml, { config }) => {
			const requireVersions = config?.requireVersions ?? true;
			const warnUnbounded = config?.warnUnbounded ?? false;
			const errors: string[] = [];

			const sections = [
				{ name: "dependencies", data: toml.dependencies },
				{ name: "dev-dependencies", data: toml["dev-dependencies"] },
			];

			for (const { name, data } of sections) {
				if (data && typeof data === "object") {
					errors.push(
						...checkSection(
							name,
							data as Record<string, unknown>,
							requireVersions,
							warnUnbounded,
						),
					);
				}
			}

			if (errors.length > 0) {
				return {
					error: errors.join("; "),
					manualFix:
						'Add specific version constraints (e.g., ">= 1.0.0 and < 2.0.0") to all dependencies.',
				};
			}

			return true;
		},
	});
