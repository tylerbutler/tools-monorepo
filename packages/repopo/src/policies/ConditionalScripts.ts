import jsonfile from "jsonfile";
import type { PackageJson } from "type-fest";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * A required script entry for conditional requirements. Can be either:
 * - A string (script name only, no default value)
 * - An object with a single key-value pair (script name → default value for auto-fix)
 *
 * @example
 * ```typescript
 * // Script must exist, no auto-fix available
 * "test"
 *
 * // Script must exist, auto-fix will add this value if missing
 * { clean: "rimraf dist" }
 * ```
 *
 * @alpha
 */
export type ConditionalScriptEntry = string | Record<string, string>;

/**
 * Configuration for a conditional script requirement.
 *
 * @alpha
 */
export interface ConditionalScriptRule {
	/**
	 * The script that triggers the requirement.
	 * If this script exists, then `requires` must also exist.
	 */
	ifPresent: string;

	/**
	 * Scripts that must be present if `ifPresent` script exists.
	 *
	 * @remarks
	 * Each entry can be:
	 * - A string: Script must exist, no auto-fix available
	 * - An object `{ scriptName: "default value" }`: Script must exist, auto-fix adds the
	 *   default value if missing
	 *
	 * @example
	 * ```typescript
	 * requires: ["test", { clean: "rimraf dist" }]
	 * ```
	 */
	requires: ConditionalScriptEntry[];
}

/**
 * Configuration for the ConditionalScripts policy.
 *
 * @alpha
 */
export interface ConditionalScriptsConfig {
	/**
	 * Conditional script requirements. If a script is present, other scripts must also exist.
	 *
	 * @remarks
	 * This is useful for enforcing that packages with a "build" script also have a "clean" script,
	 * or packages with "test" also have "test:coverage".
	 *
	 * @example
	 * ```typescript
	 * rules: [
	 *   { ifPresent: "build", requires: [{ clean: "rimraf dist" }] },
	 *   { ifPresent: "test", requires: ["test:coverage"] },
	 * ]
	 * ```
	 */
	rules: ConditionalScriptRule[];
}

const POLICY_NAME = "ConditionalScripts";

interface ParsedEntry {
	name: string;
	defaultValue?: string;
}

/**
 * Extracts script name and optional default value from a ConditionalScriptEntry.
 */
function parseEntry(entry: ConditionalScriptEntry): ParsedEntry {
	if (typeof entry === "string") {
		return { name: entry };
	}
	const keys = Object.keys(entry);
	if (keys.length !== 1) {
		throw new Error(
			`Invalid conditional script entry: expected single key-value pair, got ${keys.length} keys`,
		);
	}
	// biome-ignore lint/style/noNonNullAssertion: we verified length is 1
	const name = keys[0]!;
	const defaultValue = entry[name];
	return defaultValue !== undefined ? { name, defaultValue } : { name };
}

interface RuleViolation {
	triggerScript: string;
	missingScripts: string[];
}

interface ValidationResult {
	violations: RuleViolation[];
	missingWithDefaults: Array<{ name: string; defaultValue: string }>;
}

function validateConditionalRules(
	scripts: Record<string, string | undefined>,
	rules: ConditionalScriptRule[],
): ValidationResult {
	const violations: RuleViolation[] = [];
	const missingWithDefaults: Array<{ name: string; defaultValue: string }> = [];
	const seenMissing = new Set<string>();

	for (const rule of rules) {
		// Skip if the triggering script doesn't exist
		if (!Object.hasOwn(scripts, rule.ifPresent)) {
			continue;
		}

		const missingScripts: string[] = [];
		for (const entry of rule.requires) {
			const { name, defaultValue } = parseEntry(entry);
			if (!Object.hasOwn(scripts, name)) {
				missingScripts.push(name);
				if (defaultValue !== undefined && !seenMissing.has(name)) {
					missingWithDefaults.push({ name, defaultValue });
					seenMissing.add(name);
				}
			}
		}

		if (missingScripts.length > 0) {
			violations.push({
				triggerScript: rule.ifPresent,
				missingScripts,
			});
		}
	}

	return { violations, missingWithDefaults };
}

function formatViolationErrors(violations: RuleViolation[]): string[] {
	return violations.map(
		(v) =>
			`Script "${v.triggerScript}" is present, but required companion script(s) missing: ${v.missingScripts.join(", ")}`,
	);
}

async function fixMissingScripts(
	json: PackageJson,
	file: string,
	missingWithDefaults: Array<{ name: string; defaultValue: string }>,
	existingScripts: Record<string, string | undefined>,
): Promise<string[]> {
	const updatedScripts: Record<string, string> = {};

	// Copy existing scripts
	for (const [key, value] of Object.entries(existingScripts)) {
		if (value !== undefined) {
			updatedScripts[key] = value;
		}
	}

	// Add missing scripts with defaults
	const fixedScripts: string[] = [];
	for (const { name, defaultValue } of missingWithDefaults) {
		updatedScripts[name] = defaultValue;
		fixedScripts.push(name);
	}

	await jsonfile.writeFile(
		file,
		{ ...json, scripts: updatedScripts },
		{ spaces: 2 },
	);

	return fixedScripts;
}

/**
 * A policy that validates conditional script requirements in package.json.
 *
 * @remarks
 * Use this policy when you want to enforce that the presence of one script
 * requires other scripts to also exist. For example, if "build" exists,
 * then "clean" must also exist.
 *
 * @example
 * ```typescript
 * import { policy } from "repopo";
 * import { ConditionalScripts } from "repopo/policies";
 *
 * policy(ConditionalScripts, {
 *   rules: [
 *     // If "build" exists, "clean" must also exist (with auto-fix default)
 *     { ifPresent: "build", requires: [{ clean: "rimraf dist" }] },
 *     // If "test" exists, "test:coverage" must also exist (no auto-fix)
 *     { ifPresent: "test", requires: ["test:coverage"] },
 *   ],
 * })
 * ```
 *
 * @alpha
 */
export const ConditionalScripts = definePackagePolicy<
	PackageJson,
	ConditionalScriptsConfig | undefined
>({
	name: POLICY_NAME,
	description:
		"Validates that if certain scripts exist, other required scripts must also exist.",
	handler: async (json, { file, resolve, config }) => {
		if (config === undefined || config.rules.length === 0) {
			return true;
		}

		const scripts = json.scripts ?? {};
		const validation = validateConditionalRules(scripts, config.rules);

		if (validation.violations.length === 0) {
			return true;
		}

		const errors = formatViolationErrors(validation.violations);
		const hasAutoFixableErrors = validation.missingWithDefaults.length > 0;

		if (resolve && hasAutoFixableErrors) {
			try {
				const fixedScripts = await fixMissingScripts(
					json,
					file,
					validation.missingWithDefaults,
					scripts,
				);

				// Re-validate after fix to check for remaining errors
				const updatedScripts = { ...scripts };
				for (const name of fixedScripts) {
					const entry = validation.missingWithDefaults.find(
						(m) => m.name === name,
					);
					if (entry) {
						updatedScripts[name] = entry.defaultValue;
					}
				}

				const revalidation = validateConditionalRules(
					updatedScripts,
					config.rules,
				);
				const remainingErrors = formatViolationErrors(revalidation.violations);

				return {
					name: POLICY_NAME,
					file,
					resolved: remainingErrors.length === 0,
					errorMessages:
						remainingErrors.length > 0
							? [
									`Fixed scripts: ${fixedScripts.join(", ")}. Remaining errors:\n${remainingErrors.join("\n")}`,
								]
							: [`Fixed scripts: ${fixedScripts.join(", ")}`],
				};
			} catch {
				// Fall through to return regular failure
			}
		}

		return {
			name: POLICY_NAME,
			file,
			autoFixable: hasAutoFixableErrors,
			errorMessages: errors,
		};
	},
});
