import jsonfile from "jsonfile";
import type { PackageJson } from "type-fest";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * A required script entry. Can be either:
 * - A string (script name only, no default value)
 * - An object with a single key-value pair (script name → default value for auto-fix)
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
 * Configuration for the RequiredScripts policy.
 *
 * @alpha
 */
export interface RequiredScriptsConfig {
	/**
	 * Scripts that must be present in package.json.
	 *
	 * @remarks
	 * Each entry can be:
	 * - A string: Script must exist, no auto-fix available, content not validated
	 * - An object `{ scriptName: "default value" }`: Script must exist, auto-fix adds the
	 *   default value if missing, but existing scripts with different content still pass
	 *
	 * @example
	 * ```typescript
	 * scripts: [
	 *   "test",                        // Must exist, no auto-fix
	 *   { lint: "biome lint ." },      // Must exist, auto-fix available
	 *   { clean: "rimraf dist esm" },  // Must exist, auto-fix available
	 * ]
	 * ```
	 */
	scripts: RequiredScriptEntry[];
}

const POLICY_NAME = "RequiredScripts";

interface ParsedEntry {
	name: string;
	defaultValue?: string;
}

/**
 * Extracts script name and optional default value from a RequiredScriptEntry.
 */
function parseRequiredEntry(entry: RequiredScriptEntry): ParsedEntry {
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
	return defaultValue !== undefined ? { name, defaultValue } : { name };
}

interface ValidationResult {
	missingScripts: string[];
	missingWithDefaults: Array<{ name: string; defaultValue: string }>;
}

function validateRequiredScripts(
	scripts: Record<string, string | undefined>,
	requiredEntries: RequiredScriptEntry[],
): ValidationResult {
	const missingScripts: string[] = [];
	const missingWithDefaults: Array<{ name: string; defaultValue: string }> = [];

	for (const entry of requiredEntries) {
		const { name, defaultValue } = parseRequiredEntry(entry);
		if (!Object.hasOwn(scripts, name)) {
			missingScripts.push(name);
			if (defaultValue !== undefined) {
				missingWithDefaults.push({ name, defaultValue });
			}
		}
	}

	return { missingScripts, missingWithDefaults };
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
 * A policy that validates required scripts exist in package.json.
 *
 * @remarks
 * Use this policy when you want to ensure specific scripts are present.
 * Scripts can be specified with optional default values that enable auto-fix.
 *
 * Note: This policy only checks for script presence. It does NOT validate
 * the script's content. Use ExactScripts for content validation.
 *
 * @example
 * ```typescript
 * import { policy } from "repopo";
 * import { RequiredScripts } from "repopo/policies";
 *
 * policy(RequiredScripts, {
 *   scripts: [
 *     "test",                        // Must exist, no auto-fix
 *     { lint: "biome lint ." },      // Must exist, auto-fix adds default if missing
 *     { clean: "rimraf dist esm" },  // Must exist, auto-fix adds default if missing
 *   ],
 * })
 * ```
 *
 * @alpha
 */
export const RequiredScripts = definePackagePolicy<
	PackageJson,
	RequiredScriptsConfig | undefined
>({
	name: POLICY_NAME,
	description: "Validates that required scripts exist in package.json.",
	handler: async (json, { file, resolve, config }) => {
		if (config === undefined || config.scripts.length === 0) {
			return true;
		}

		const scripts = json.scripts ?? {};
		const validation = validateRequiredScripts(scripts, config.scripts);

		if (validation.missingScripts.length === 0) {
			return true;
		}

		const hasAutoFixableErrors = validation.missingWithDefaults.length > 0;

		if (resolve && hasAutoFixableErrors) {
			try {
				const fixedScripts = await fixMissingScripts(
					json,
					file,
					validation.missingWithDefaults,
					scripts,
				);

				// Check if there are still missing scripts (those without defaults)
				const stillMissing = validation.missingScripts.filter(
					(name) => !fixedScripts.includes(name),
				);

				return {
					name: POLICY_NAME,
					file,
					resolved: stillMissing.length === 0,
					errorMessages:
						stillMissing.length > 0
							? [
									`Fixed scripts: ${fixedScripts.join(", ")}. Still missing: ${stillMissing.join(", ")}`,
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
			errorMessages: [
				`Missing required scripts:\n\t${validation.missingScripts.join("\n\t")}`,
			],
		};
	},
});
