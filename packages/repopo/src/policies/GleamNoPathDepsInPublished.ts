import type { PolicyShape } from "../policy.js";
import {
	defineGleamPolicy,
	type GleamToml,
} from "../policyDefiners/defineGleamPolicy.js";

/**
 * Configuration for the GleamNoPathDepsInPublished policy.
 *
 * @alpha
 */
export interface GleamNoPathDepsInPublishedConfig {
	/**
	 * If true, only check packages that don't have a "private" marker.
	 * Since Gleam doesn't have a native "private" field, this checks for
	 * the absence of a description (unpublished packages often lack one).
	 * @defaultValue false
	 */
	onlyPublishable?: boolean;
}

function findPathDeps(deps: Record<string, unknown>): string[] {
	const pathDeps: string[] = [];
	for (const [name, value] of Object.entries(deps)) {
		if (typeof value === "object" && value !== null) {
			const record = value as Record<string, unknown>;
			if (typeof record.path === "string") {
				pathDeps.push(name);
			}
		}
	}
	return pathDeps;
}

/**
 * A policy that warns when path dependencies are used in packages intended for publishing.
 *
 * @alpha
 */
export const GleamNoPathDepsInPublished: PolicyShape<GleamNoPathDepsInPublishedConfig> =
	defineGleamPolicy({
		name: "GleamNoPathDepsInPublished",
		description:
			"Warns when path dependencies are used in packages intended for publishing to Hex.",
		handler: async (toml: GleamToml, { config }) => {
			if (config?.onlyPublishable && !toml.description) {
				return true;
			}

			const errors: string[] = [];

			const deps = toml.dependencies as Record<string, unknown> | undefined;
			if (deps) {
				const pathDeps = findPathDeps(deps);
				for (const dep of pathDeps) {
					errors.push(
						`[dependencies] "${dep}" uses a path dependency, which will break when published to Hex`,
					);
				}
			}

			if (errors.length > 0) {
				return {
					error: errors.join("; "),
					manualFix:
						"Replace path dependencies with version constraints before publishing.",
				};
			}

			return true;
		},
	});
