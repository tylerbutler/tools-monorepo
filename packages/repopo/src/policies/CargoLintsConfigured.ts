import type { PolicyHandlerResult, PolicyShape } from "../policy.js";
import {
	type CargoToml,
	defineCargoPolicy,
} from "../policyDefiners/defineCargoPolicy.js";

/**
 * Configuration for the CargoLintsConfigured policy.
 *
 * @alpha
 */
export interface CargoLintsConfiguredConfig {
	/**
	 * Required clippy lint levels. Keys are lint names (without the `clippy::` prefix),
	 * values are the minimum level ("warn" or "deny").
	 *
	 * @example
	 * ```typescript
	 * { pedantic: "warn", nursery: "warn" }
	 * ```
	 */
	required?: Record<string, string>;

	/**
	 * If true, just require that a [lints.clippy] section exists (without checking specific lints).
	 * @defaultValue true
	 */
	requireSection?: boolean;
}

function checkClippyLints(
	clippy: Record<string, unknown>,
	required: Record<string, string>,
): string[] {
	const errors: string[] = [];
	for (const [lint, expectedLevel] of Object.entries(required)) {
		const actual = clippy[lint];
		if (actual === undefined) {
			errors.push(
				`Missing clippy lint: ${lint} (expected level: "${expectedLevel}")`,
			);
		} else if (String(actual) !== expectedLevel) {
			errors.push(
				`Clippy lint ${lint} = "${String(actual)}", expected "${expectedLevel}"`,
			);
		}
	}
	return errors;
}

function checkLintsSection(
	toml: CargoToml,
	config: CargoLintsConfiguredConfig | undefined,
): PolicyHandlerResult {
	const lints = toml.lints as Record<string, unknown> | undefined;
	const requireSection = config?.requireSection ?? true;

	if (requireSection && lints === undefined) {
		return {
			error: "Missing [lints] section in Cargo.toml.",
			manualFix:
				'Add a [lints.clippy] section, e.g.:\n[lints.clippy]\npedantic = "warn"',
		};
	}

	if (lints === undefined) {
		return true;
	}

	const clippy = lints.clippy as Record<string, unknown> | undefined;
	if (requireSection && clippy === undefined) {
		return {
			error: "Missing [lints.clippy] section in Cargo.toml.",
			manualFix:
				'Add a [lints.clippy] section, e.g.:\n[lints.clippy]\npedantic = "warn"',
		};
	}

	if (config?.required && clippy) {
		const errors = checkClippyLints(clippy, config.required);
		if (errors.length > 0) {
			return {
				error: errors.join("; "),
				manualFix:
					"Update the [lints.clippy] section with the required lint levels.",
			};
		}
	}

	return true;
}

/**
 * A policy that ensures Cargo.toml has a [lints.clippy] section configured.
 *
 * @alpha
 */
export const CargoLintsConfigured: PolicyShape<CargoLintsConfiguredConfig> =
	defineCargoPolicy({
		name: "CargoLintsConfigured",
		description:
			"Ensures Cargo.toml has clippy lints configured in the [lints] section.",
		handler: async (toml: CargoToml, { config }) => {
			// Skip workspace root Cargo.toml files
			if (toml.workspace !== undefined && toml.package === undefined) {
				return true;
			}

			return checkLintsSection(toml, config);
		},
	});
