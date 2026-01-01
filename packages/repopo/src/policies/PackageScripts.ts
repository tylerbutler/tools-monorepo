import jsonfile from "jsonfile";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
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
	const name = keys[0];
	return { name, defaultValue: entry[name] };
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
		for (const entry of config.must) {
			const { name, defaultValue } = parseRequiredEntry(entry);
			if (defaultValue !== undefined) {
				defaults[name] = defaultValue;
			}
		}
	}

	// Add defaults from conditionalRequired entries
	if (config.conditionalRequired) {
		for (const rule of config.conditionalRequired) {
			for (const entry of rule.requires) {
				const { name, defaultValue } = parseRequiredEntry(entry);
				if (defaultValue !== undefined) {
					defaults[name] = defaultValue;
				}
			}
		}
	}

	// Add defaults from exact (these override must/conditionalRequired if both specified)
	if (config.exact) {
		for (const [name, value] of Object.entries(config.exact)) {
			defaults[name] = value;
		}
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
				if (!(scripts && Object.hasOwn(scripts, name))) {
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
>("PackageScripts", async (json, { file, resolve, config }) => {
	if (config === undefined) {
		return true;
	}

	const hasScriptsField = Object.hasOwn(json, "scripts");
	const scripts = hasScriptsField ? json.scripts : {};
	const errorMessages: string[] = [];

	// Build a map of all default values for auto-fix
	const defaultScripts = buildDefaultsMap(config);

	// Track which missing scripts have defaults available for auto-fix
	const missingScriptsWithDefaults: string[] = [];
	// Track which existing scripts don't match their exact values
	const mismatchedScripts: string[] = [];

	// Validate required scripts from 'must'
	if (config.must && config.must.length > 0) {
		const missingScripts: string[] = [];
		for (const entry of config.must) {
			const { name, defaultValue } = parseRequiredEntry(entry);
			if (!(scripts && Object.hasOwn(scripts, name))) {
				missingScripts.push(name);
				// Check if this missing script has a default for auto-fix
				if (defaultValue !== undefined) {
					missingScriptsWithDefaults.push(name);
				}
			}
		}

		if (missingScripts.length > 0) {
			errorMessages.push(
				`Missing required scripts:\n\t${missingScripts.join("\n\t")}`,
			);
		}
	}

	// Validate scripts from 'exact' - must exist AND match exactly
	if (config.exact && Object.keys(config.exact).length > 0) {
		for (const [scriptName, expectedValue] of Object.entries(config.exact)) {
			if (scripts && Object.hasOwn(scripts, scriptName)) {
				// Script exists - check if it matches
				const actualValue = scripts[scriptName];
				if (actualValue !== expectedValue) {
					mismatchedScripts.push(scriptName);
					errorMessages.push(
						`Script "${scriptName}" must be "${expectedValue}", but found "${actualValue}"`,
					);
				}
			} else {
				// Script is missing
				missingScriptsWithDefaults.push(scriptName);
				errorMessages.push(`Missing required script: ${scriptName}`);
			}
		}
	}

	// Validate mutually exclusive script groups
	if (config.mutuallyExclusive && config.mutuallyExclusive.length > 0) {
		errorMessages.push(
			...validateMutuallyExclusiveScripts(config.mutuallyExclusive, scripts),
		);
	}

	// Validate conditional requirements (if X exists, Y must also exist)
	if (config.conditionalRequired && config.conditionalRequired.length > 0) {
		for (const rule of config.conditionalRequired) {
			// Check if the triggering script exists
			if (scripts && Object.hasOwn(scripts, rule.ifPresent)) {
				// Find missing required scripts
				const missingRequired: string[] = [];
				for (const entry of rule.requires) {
					const { name } = parseRequiredEntry(entry);
					if (!(scripts && Object.hasOwn(scripts, name))) {
						missingRequired.push(name);
					}
				}

				for (const scriptName of missingRequired) {
					// Check if this missing script has a default for auto-fix
					if (
						scriptName in defaultScripts &&
						!missingScriptsWithDefaults.includes(scriptName)
					) {
						missingScriptsWithDefaults.push(scriptName);
					}
				}

				if (missingRequired.length > 0) {
					errorMessages.push(
						`Script "${rule.ifPresent}" is present, but required companion script(s) missing: ${missingRequired.join(", ")}`,
					);
				}
			}
		}
	}

	// Validate script body contents
	if (config.scriptMustContain && config.scriptMustContain.length > 0) {
		errorMessages.push(
			...validateScriptContents(config.scriptMustContain, scripts),
		);
	}

	// Determine if errors are auto-fixable
	const hasAutoFixableErrors =
		missingScriptsWithDefaults.length > 0 || mismatchedScripts.length > 0;

	if (errorMessages.length > 0) {
		// If we can auto-fix and resolve is requested, apply the fix
		if (resolve && hasAutoFixableErrors) {
			// Create a new scripts object with defaults for missing/mismatched scripts
			const updatedScripts: Record<string, string> = { ...scripts };
			const fixedScripts: string[] = [];

			// Fix missing scripts
			for (const scriptName of missingScriptsWithDefaults) {
				if (scriptName in defaultScripts) {
					updatedScripts[scriptName] = defaultScripts[scriptName];
					fixedScripts.push(scriptName);
				}
			}

			// Fix mismatched scripts (overwrite with defaults)
			for (const scriptName of mismatchedScripts) {
				if (scriptName in defaultScripts) {
					updatedScripts[scriptName] = defaultScripts[scriptName];
					if (!fixedScripts.includes(scriptName)) {
						fixedScripts.push(scriptName);
					}
				}
			}

			// Update the package.json
			const updatedJson: PackageJson = {
				...json,
				scripts: updatedScripts,
			};

			try {
				await jsonfile.writeFile(file, updatedJson, { spaces: 2 });

				// Recalculate remaining errors properly after fix
				const postFixErrors: string[] = [];

				// Re-validate mutually exclusive (these can't be auto-fixed)
				if (config.mutuallyExclusive && config.mutuallyExclusive.length > 0) {
					postFixErrors.push(
						...validateMutuallyExclusiveScripts(
							config.mutuallyExclusive,
							updatedScripts,
						),
					);
				}

				// Re-validate script contents (these can't be auto-fixed)
				if (config.scriptMustContain && config.scriptMustContain.length > 0) {
					postFixErrors.push(
						...validateScriptContents(config.scriptMustContain, updatedScripts),
					);
				}

				// Re-validate required scripts with the updated scripts
				if (config.must && config.must.length > 0) {
					const stillMissing: string[] = [];
					for (const entry of config.must) {
						const { name } = parseRequiredEntry(entry);
						if (!Object.hasOwn(updatedScripts, name)) {
							stillMissing.push(name);
						}
					}
					if (stillMissing.length > 0) {
						postFixErrors.push(
							`Missing required scripts:\n\t${stillMissing.join("\n\t")}`,
						);
					}
				}

				// Re-validate exact scripts
				if (config.exact && Object.keys(config.exact).length > 0) {
					for (const [scriptName, expectedValue] of Object.entries(
						config.exact,
					)) {
						if (!Object.hasOwn(updatedScripts, scriptName)) {
							postFixErrors.push(`Missing required script: ${scriptName}`);
						} else if (updatedScripts[scriptName] !== expectedValue) {
							postFixErrors.push(
								`Script "${scriptName}" must be "${expectedValue}", but found "${updatedScripts[scriptName]}"`,
							);
						}
					}
				}

				// Re-validate conditional requirements
				if (
					config.conditionalRequired &&
					config.conditionalRequired.length > 0
				) {
					postFixErrors.push(
						...validateConditionalRequirements(
							config.conditionalRequired,
							updatedScripts,
						),
					);
				}

				const fixResult: PolicyFixResult = {
					name: PackageScripts.name,
					file,
					resolved: postFixErrors.length === 0,
					errorMessage:
						postFixErrors.length > 0
							? `Fixed scripts: ${fixedScripts.join(", ")}. Remaining errors:\n${postFixErrors.join("\n\n")}`
							: `Fixed scripts: ${fixedScripts.join(", ")}`,
				};
				return fixResult;
			} catch {
				// Fall through to return regular failure
			}
		}

		const failResult: PolicyFailure = {
			name: PackageScripts.name,
			file,
			autoFixable: hasAutoFixableErrors,
			errorMessage: errorMessages.join("\n\n"),
		};
		return failResult;
	}

	return true;
});
