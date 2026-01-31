import jsonfile from "jsonfile";
import type { PackageJson } from "type-fest";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * Configuration for validating that a script's body contains required substrings.
 *
 * @alpha
 */
export interface ScriptMustContainRule {
	/**
	 * The name of the script to validate.
	 */
	script: string;

	/**
	 * Substrings that must appear in the script body.
	 * All substrings must be present for the script to pass validation.
	 */
	mustContain: string[];
}

/**
 * Configuration for conditional script requirements.
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
	 *
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
	requires: RequiredScriptEntry[];
}

/**
 * A required script entry. Can be either:
 * - A string (script name only, no default value)
 * - An object with a single key-value pair (script name → default value)
 *
 * @example
 * ```typescript
 * // Script must exist, no auto-fix available
 * "test"
 *
 * // Script must exist, auto-fix will add this value if missing
 * { lint: "biome lint ." }
 * ```
 *
 * @alpha
 */
export type RequiredScriptEntry = string | Record<string, string>;

/**
 * Policy settings for the PackageScripts repo policy.
 *
 * @alpha
 */
export interface PackageScriptsSettings {
	/**
	 * Scripts that must be present in package.json.
	 *
	 * @remarks
	 *
	 * Each entry can be:
	 * - A string: Script must exist, no auto-fix available, content not validated
	 * - An object `{ scriptName: "default value" }`: Script must exist, auto-fix adds the
	 *   default value if missing, but existing scripts with different content still pass
	 *
	 * @example
	 * ```typescript
	 * must: [
	 *   "test",                        // Must exist, no auto-fix
	 *   { lint: "biome lint ." },      // Must exist, auto-fix available
	 *   { clean: "rimraf dist esm" },  // Must exist, auto-fix available
	 * ]
	 * ```
	 */
	must?: RequiredScriptEntry[];

	/**
	 * Scripts that must exist AND have exact content.
	 *
	 * @remarks
	 *
	 * Unlike {@link PackageScriptsSettings.must}, scripts in `exact` are validated against
	 * the specified value. If a script exists but has different content, it fails validation.
	 * Both missing and mismatched scripts are auto-fixable.
	 *
	 * @example
	 * ```typescript
	 * exact: {
	 *   clean: "rimraf dist esm",
	 *   format: "biome format --write .",
	 * }
	 * ```
	 */
	exact?: Record<string, string>;

	/**
	 * List of mutually exclusive script groups. Each group is an array of script names
	 * where at most one script from the group can be present.
	 *
	 * Packages can have zero scripts from the group (all optional), but cannot have
	 * multiple scripts from the same group.
	 *
	 * @example
	 * ```typescript
	 * // Allow "test:unit" OR "test:vitest" OR neither, but not both
	 * mutuallyExclusive: [["test:unit", "test:vitest"]]
	 * ```
	 */
	mutuallyExclusive?: string[][];

	/**
	 * Conditional script requirements. If a script is present, other scripts must also exist.
	 *
	 * @remarks
	 *
	 * This is useful for enforcing that packages with a "build" script also have a "clean" script,
	 * or packages with "test" also have "test:coverage".
	 *
	 * The `requires` field accepts the same format as {@link PackageScriptsSettings.must}:
	 * - Strings: Script must exist, no auto-fix available
	 * - Objects `{ scriptName: "default" }`: Script must exist, auto-fix adds the default if missing
	 *
	 * @example
	 * ```typescript
	 * // If "build" exists, "clean" must also exist (with auto-fix default)
	 * conditionalRequired: [{ ifPresent: "build", requires: [{ clean: "rimraf dist" }] }]
	 *
	 * // Mixed: "test" required without default, "clean" with default
	 * conditionalRequired: [{ ifPresent: "build", requires: ["test", { clean: "rimraf dist" }] }]
	 * ```
	 */
	conditionalRequired?: ConditionalScriptRule[];

	/**
	 * Rules for validating script body content.
	 *
	 * @remarks
	 *
	 * This allows you to ensure that specific scripts contain required commands or patterns
	 * without requiring an exact match. For example, requiring that the "clean" script uses
	 * "rimraf" or that "build" includes "tsc".
	 *
	 * For exact content matching, use {@link PackageScriptsSettings.exact} instead.
	 *
	 * @example
	 * ```typescript
	 * scriptMustContain: [
	 *   { script: "clean", mustContain: ["rimraf"] },
	 *   { script: "build", mustContain: ["tsc"] },
	 * ]
	 * ```
	 */
	scriptMustContain?: ScriptMustContainRule[];
}

const POLICY_NAME = "PackageScripts";

/**
 * Extracts script name and optional default value from a RequiredScriptEntry.
 */
function parseRequiredEntry(entry: RequiredScriptEntry): {
	name: string;
	defaultValue?: string;
} {
	if (typeof entry === "string") {
		return { name: entry };
	}
	const keys = Object.keys(entry);
	if (keys.length !== 1) {
		throw new Error(
			`Invalid required script entry: expected single key-value pair, got ${keys.length} keys`,
		);
	}
	// biome-ignore lint/style/noNonNullAssertion: we verified length is 1
	const name = keys[0]!;
	const defaultValue = entry[name];
	// Only include defaultValue if it's defined (exactOptionalPropertyTypes)
	return defaultValue !== undefined ? { name, defaultValue } : { name };
}

/**
 * Extract defaults from RequiredScriptEntry array.
 */
function extractDefaultsFromEntries(
	entries: RequiredScriptEntry[],
	defaults: Record<string, string>,
): void {
	for (const entry of entries) {
		const { name, defaultValue } = parseRequiredEntry(entry);
		if (defaultValue !== undefined) {
			defaults[name] = defaultValue;
		}
	}
}

/**
 * Builds a map of script names to their default values from must, conditionalRequired, and exact configs.
 */
function buildDefaultsMap(
	config: PackageScriptsSettings,
): Record<string, string> {
	const defaults: Record<string, string> = {};

	// Add defaults from must entries
	if (config.must) {
		extractDefaultsFromEntries(config.must, defaults);
	}

	// Add defaults from conditionalRequired entries
	if (config.conditionalRequired) {
		for (const rule of config.conditionalRequired) {
			extractDefaultsFromEntries(rule.requires, defaults);
		}
	}

	// Add defaults from exact (these override must/conditionalRequired if both specified)
	if (config.exact) {
		Object.assign(defaults, config.exact);
	}

	return defaults;
}

/**
 * Validates mutually exclusive script groups and returns error messages for violations.
 */
function validateMutuallyExclusiveScripts(
	groups: string[][],
	scripts: PackageJson["scripts"],
): string[] {
	const errors: string[] = [];

	for (const group of groups) {
		const presentScripts = group.filter(
			(scriptName) => scripts && Object.hasOwn(scripts, scriptName),
		);

		// Only fail if MORE than one script from the group is present
		if (presentScripts.length > 1) {
			errors.push(
				`Scripts are mutually exclusive, but found ${presentScripts.length}: ${presentScripts.join(", ")}`,
			);
		}
	}

	return errors;
}

/**
 * Validates conditional script requirements (if X exists, Y must also exist).
 */
function validateConditionalRequirements(
	rules: ConditionalScriptRule[],
	scripts: PackageJson["scripts"],
): string[] {
	const errors: string[] = [];

	for (const rule of rules) {
		// Check if the triggering script exists
		if (scripts && Object.hasOwn(scripts, rule.ifPresent)) {
			// Find missing required scripts
			const missingRequired: string[] = [];
			for (const entry of rule.requires) {
				const { name } = parseRequiredEntry(entry);
				if (!Object.hasOwn(scripts, name)) {
					missingRequired.push(name);
				}
			}

			if (missingRequired.length > 0) {
				errors.push(
					`Script "${rule.ifPresent}" is present, but required companion script(s) missing: ${missingRequired.join(", ")}`,
				);
			}
		}
	}

	return errors;
}

/**
 * Validates that script bodies contain required substrings.
 */
function validateScriptContents(
	rules: ScriptMustContainRule[],
	scripts: PackageJson["scripts"],
): string[] {
	const errors: string[] = [];

	for (const rule of rules) {
		// Only validate if the script exists
		if (scripts && Object.hasOwn(scripts, rule.script)) {
			const scriptBody = scripts[rule.script];
			if (typeof scriptBody === "string") {
				const missingSubstrings = rule.mustContain.filter(
					(substring) => !scriptBody.includes(substring),
				);

				if (missingSubstrings.length > 0) {
					errors.push(
						`Script "${rule.script}" must contain: ${missingSubstrings.join(", ")}`,
					);
				}
			}
		}
	}

	return errors;
}

/**
 * Result of validating required scripts.
 */
interface MustScriptsResult {
	errors: string[];
	missingWithDefaults: string[];
}

/**
 * Validates required scripts from 'must' config.
 */
function validateMustScripts(
	must: RequiredScriptEntry[],
	scripts: PackageJson["scripts"],
): MustScriptsResult {
	const missingScripts: string[] = [];
	const missingWithDefaults: string[] = [];

	for (const entry of must) {
		const { name, defaultValue } = parseRequiredEntry(entry);
		if (!(scripts && Object.hasOwn(scripts, name))) {
			missingScripts.push(name);
			if (defaultValue !== undefined) {
				missingWithDefaults.push(name);
			}
		}
	}

	const errors: string[] = [];
	if (missingScripts.length > 0) {
		errors.push(`Missing required scripts:\n\t${missingScripts.join("\n\t")}`);
	}

	return { errors, missingWithDefaults };
}

/**
 * Result of validating exact scripts.
 */
interface ExactScriptsResult {
	errors: string[];
	missingWithDefaults: string[];
	mismatchedScripts: string[];
}

/**
 * Validates scripts from 'exact' config - must exist AND match exactly.
 */
function validateExactScripts(
	exact: Record<string, string>,
	scripts: PackageJson["scripts"],
): ExactScriptsResult {
	const errors: string[] = [];
	const missingWithDefaults: string[] = [];
	const mismatchedScripts: string[] = [];

	for (const [scriptName, expectedValue] of Object.entries(exact)) {
		if (scripts && Object.hasOwn(scripts, scriptName)) {
			const actualValue = scripts[scriptName];
			if (actualValue !== expectedValue) {
				mismatchedScripts.push(scriptName);
				errors.push(
					`Script "${scriptName}" must be "${expectedValue}", but found "${actualValue}"`,
				);
			}
		} else {
			missingWithDefaults.push(scriptName);
			errors.push(`Missing required script: ${scriptName}`);
		}
	}

	return { errors, missingWithDefaults, mismatchedScripts };
}

/**
 * Result of validating conditional requirements.
 */
interface ConditionalResult {
	errors: string[];
	missingWithDefaults: string[];
}

/**
 * Find missing scripts from a conditional rule's requirements.
 */
function findMissingFromRule(
	rule: ConditionalScriptRule,
	scripts: PackageJson["scripts"],
): string[] {
	return rule.requires
		.map((entry) => parseRequiredEntry(entry).name)
		.filter((name) => !(scripts && Object.hasOwn(scripts, name)));
}

/**
 * Validates conditional requirements and tracks missing scripts with defaults.
 */
function validateConditionalWithDefaults(
	rules: ConditionalScriptRule[],
	scripts: PackageJson["scripts"],
	defaultScripts: Record<string, string>,
	existingMissingWithDefaults: string[],
): ConditionalResult {
	const errors: string[] = [];
	const missingWithDefaults: string[] = [];
	const allTracked = new Set(existingMissingWithDefaults);

	for (const rule of rules) {
		if (!(scripts && Object.hasOwn(scripts, rule.ifPresent))) {
			continue;
		}

		const missingRequired = findMissingFromRule(rule, scripts);

		for (const scriptName of missingRequired) {
			if (scriptName in defaultScripts && !allTracked.has(scriptName)) {
				missingWithDefaults.push(scriptName);
				allTracked.add(scriptName);
			}
		}

		if (missingRequired.length > 0) {
			errors.push(
				`Script "${rule.ifPresent}" is present, but required companion script(s) missing: ${missingRequired.join(", ")}`,
			);
		}
	}

	return { errors, missingWithDefaults };
}

/**
 * Apply fixes to scripts and return the updated scripts object.
 */
function applyScriptFixes(
	scripts: PackageJson["scripts"],
	missingScriptsWithDefaults: string[],
	mismatchedScripts: string[],
	defaultScripts: Record<string, string>,
): { updatedScripts: Record<string, string>; fixedScripts: string[] } {
	const updatedScripts: Record<string, string> = {};

	// Copy existing scripts, filtering out undefined values
	if (scripts) {
		for (const [key, value] of Object.entries(scripts)) {
			if (value !== undefined) {
				updatedScripts[key] = value;
			}
		}
	}

	const fixedScripts: string[] = [];

	for (const scriptName of missingScriptsWithDefaults) {
		const defaultValue = defaultScripts[scriptName];
		if (defaultValue !== undefined) {
			updatedScripts[scriptName] = defaultValue;
			fixedScripts.push(scriptName);
		}
	}

	for (const scriptName of mismatchedScripts) {
		const defaultValue = defaultScripts[scriptName];
		if (defaultValue !== undefined && !fixedScripts.includes(scriptName)) {
			updatedScripts[scriptName] = defaultValue;
			fixedScripts.push(scriptName);
		}
	}

	return { updatedScripts, fixedScripts };
}

/**
 * Validate 'must' scripts and return any remaining missing scripts.
 */
function validateRemainingMustScripts(
	must: RequiredScriptEntry[],
	scripts: Record<string, string>,
): string[] {
	const stillMissing = must
		.map((entry) => parseRequiredEntry(entry).name)
		.filter((name) => !Object.hasOwn(scripts, name));

	if (stillMissing.length > 0) {
		return [`Missing required scripts:\n\t${stillMissing.join("\n\t")}`];
	}
	return [];
}

/**
 * Validate 'exact' scripts and return any errors.
 */
function validateRemainingExactScripts(
	exact: Record<string, string>,
	scripts: Record<string, string>,
): string[] {
	const errors: string[] = [];
	for (const [scriptName, expectedValue] of Object.entries(exact)) {
		if (!Object.hasOwn(scripts, scriptName)) {
			errors.push(`Missing required script: ${scriptName}`);
		} else if (scripts[scriptName] !== expectedValue) {
			errors.push(
				`Script "${scriptName}" must be "${expectedValue}", but found "${scripts[scriptName]}"`,
			);
		}
	}
	return errors;
}

/**
 * Re-validate all rules after applying fixes.
 */
function revalidateAfterFix(
	config: PackageScriptsSettings,
	updatedScripts: Record<string, string>,
): string[] {
	const errors: string[] = [];

	if (
		config.mutuallyExclusive !== undefined &&
		config.mutuallyExclusive.length > 0
	) {
		errors.push(
			...validateMutuallyExclusiveScripts(
				config.mutuallyExclusive,
				updatedScripts,
			),
		);
	}

	if (
		config.scriptMustContain !== undefined &&
		config.scriptMustContain.length > 0
	) {
		errors.push(
			...validateScriptContents(config.scriptMustContain, updatedScripts),
		);
	}

	if (config.must !== undefined && config.must.length > 0) {
		errors.push(...validateRemainingMustScripts(config.must, updatedScripts));
	}

	if (config.exact !== undefined && Object.keys(config.exact).length > 0) {
		errors.push(...validateRemainingExactScripts(config.exact, updatedScripts));
	}

	if (
		config.conditionalRequired !== undefined &&
		config.conditionalRequired.length > 0
	) {
		errors.push(
			...validateConditionalRequirements(
				config.conditionalRequired,
				updatedScripts,
			),
		);
	}

	return errors;
}

/**
 * Result of running all script validations.
 */
interface AllValidationsResult {
	errors: string[];
	missingWithDefaults: string[];
	mismatchedScripts: string[];
}

/**
 * Run all script validations and aggregate results.
 */
function runAllValidations(
	config: PackageScriptsSettings,
	scripts: PackageJson["scripts"],
	defaultScripts: Record<string, string>,
): AllValidationsResult {
	const errors: string[] = [];
	const missingWithDefaults: string[] = [];
	let mismatchedScripts: string[] = [];

	if (config.must !== undefined && config.must.length > 0) {
		const result = validateMustScripts(config.must, scripts);
		errors.push(...result.errors);
		missingWithDefaults.push(...result.missingWithDefaults);
	}

	if (config.exact !== undefined && Object.keys(config.exact).length > 0) {
		const result = validateExactScripts(config.exact, scripts);
		errors.push(...result.errors);
		missingWithDefaults.push(...result.missingWithDefaults);
		mismatchedScripts = result.mismatchedScripts;
	}

	if (
		config.mutuallyExclusive !== undefined &&
		config.mutuallyExclusive.length > 0
	) {
		errors.push(
			...validateMutuallyExclusiveScripts(config.mutuallyExclusive, scripts),
		);
	}

	if (
		config.conditionalRequired !== undefined &&
		config.conditionalRequired.length > 0
	) {
		const result = validateConditionalWithDefaults(
			config.conditionalRequired,
			scripts,
			defaultScripts,
			missingWithDefaults,
		);
		errors.push(...result.errors);
		missingWithDefaults.push(...result.missingWithDefaults);
	}

	if (
		config.scriptMustContain !== undefined &&
		config.scriptMustContain.length > 0
	) {
		errors.push(...validateScriptContents(config.scriptMustContain, scripts));
	}

	return { errors, missingWithDefaults, mismatchedScripts };
}

/**
 * A RepoPolicy that validates package.json scripts based on configurable rules.
 *
 * @remarks
 *
 * This policy provides comprehensive script validation including:
 * - Required scripts that must be present (with optional defaults for auto-fix)
 * - Exact script content enforcement
 * - Mutually exclusive script groups (at most one can exist)
 * - Conditional requirements (if X exists, Y must also exist)
 * - Script body content validation (script must contain specific substrings)
 *
 * @example
 * ```typescript
 * import { makePolicy } from "repopo";
 * import { PackageScripts } from "repopo/policies";
 *
 * const config: RepopoConfig = {
 *   policies: [
 *     makePolicy(PackageScripts, {
 *       // Scripts that must exist
 *       must: [
 *         "test",                        // Must exist, no auto-fix
 *         { build: "tsc" },              // Must exist, auto-fix available
 *         { lint: "biome lint ." },      // Must exist, auto-fix available
 *       ],
 *       // Scripts that must exist AND match exactly
 *       exact: {
 *         clean: "rimraf dist esm",
 *         format: "biome format --write .",
 *       },
 *       // If "build" exists, "clean" must also exist (with inline auto-fix default)
 *       conditionalRequired: [{ ifPresent: "build", requires: [{ clean: "rimraf dist" }] }],
 *       // Script body must contain these substrings
 *       scriptMustContain: [{ script: "build", mustContain: ["tsc"] }],
 *       // Only one of these can exist
 *       mutuallyExclusive: [["lint:eslint", "lint:biome"]],
 *     }),
 *   ],
 * };
 * ```
 *
 * @alpha
 */
export const PackageScripts = definePackagePolicy<
	PackageJson,
	PackageScriptsSettings | undefined
>(
	"PackageScripts",
	"Validates package.json scripts based on configurable rules including required scripts, exact content, and conditional requirements.",
	async (json, { file, resolve, config }) => {
		if (config === undefined) {
			return true;
		}

		const scripts = Object.hasOwn(json, "scripts") ? json.scripts : {};
		const defaultScripts = buildDefaultsMap(config);

		const { errors, missingWithDefaults, mismatchedScripts } =
			runAllValidations(config, scripts, defaultScripts);

		if (errors.length === 0) {
			return true;
		}

		const hasAutoFixableErrors =
			missingWithDefaults.length > 0 || mismatchedScripts.length > 0;

		if (resolve && hasAutoFixableErrors) {
			const { updatedScripts, fixedScripts } = applyScriptFixes(
				scripts,
				missingWithDefaults,
				mismatchedScripts,
				defaultScripts,
			);

			try {
				await jsonfile.writeFile(
					file,
					{ ...json, scripts: updatedScripts },
					{ spaces: 2 },
				);
				const postFixErrors = revalidateAfterFix(config, updatedScripts);

				return {
					name: POLICY_NAME,
					file,
					resolved: postFixErrors.length === 0,
					errorMessages:
						postFixErrors.length > 0
							? [
									`Fixed scripts: ${fixedScripts.join(", ")}. Remaining errors:\n${postFixErrors.join("\n\n")}`,
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
);
