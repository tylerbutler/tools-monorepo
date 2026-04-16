import jsonfile from "jsonfile";
import type { PackageJson } from "type-fest";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * Configuration for the ExactScripts policy.
 *
 * @alpha
 */
export interface ExactScriptsConfig {
	/**
	 * Scripts that must exist AND have exact content.
	 *
	 * @remarks
	 * Unlike RequiredScripts, scripts in `exact` are validated against
	 * the specified value. If a script exists but has different content, it fails validation.
	 * Both missing and mismatched scripts are auto-fixable.
	 *
	 * @example
	 * ```typescript
	 * scripts: {
	 *   clean: "rimraf dist esm",
	 *   format: "biome format --write .",
	 * }
	 * ```
	 */
	scripts: Record<string, string>;
}

const POLICY_NAME = "ExactScripts";

interface ValidationResult {
	errors: string[];
	missingScripts: string[];
	mismatchedScripts: string[];
}

function validateScripts(
	scripts: Record<string, string | undefined>,
	expectedScripts: Record<string, string>,
): ValidationResult {
	const errors: string[] = [];
	const missingScripts: string[] = [];
	const mismatchedScripts: string[] = [];

	for (const [scriptName, expectedValue] of Object.entries(expectedScripts)) {
		if (Object.hasOwn(scripts, scriptName)) {
			const actualValue = scripts[scriptName];
			if (actualValue !== expectedValue) {
				mismatchedScripts.push(scriptName);
				errors.push(
					`Script "${scriptName}" must be "${expectedValue}", but found "${actualValue}"`,
				);
			}
		} else {
			missingScripts.push(scriptName);
			errors.push(`Missing required script: ${scriptName}`);
		}
	}

	return { errors, missingScripts, mismatchedScripts };
}

async function fixScripts(
	json: PackageJson,
	file: string,
	scriptsToFix: string[],
	expectedScripts: Record<string, string>,
	existingScripts: Record<string, string | undefined>,
): Promise<string[]> {
	const updatedScripts: Record<string, string> = {};

	// Copy existing scripts
	for (const [key, value] of Object.entries(existingScripts)) {
		if (value !== undefined) {
			updatedScripts[key] = value;
		}
	}

	// Add/update scripts
	const fixedScripts: string[] = [];
	for (const scriptName of scriptsToFix) {
		const expectedValue = expectedScripts[scriptName];
		if (expectedValue !== undefined) {
			updatedScripts[scriptName] = expectedValue;
			fixedScripts.push(scriptName);
		}
	}

	await jsonfile.writeFile(
		file,
		{ ...json, scripts: updatedScripts },
		{ spaces: 2 },
	);

	return fixedScripts;
}

/**
 * A policy that validates scripts exist AND have exact content in package.json.
 *
 * @remarks
 * Use this policy when you want to enforce exact script content, not just presence.
 * This is useful for scripts that must be exactly the same across packages.
 *
 * For scripts where you only care about presence (not content), use RequiredScripts instead.
 *
 * @example
 * ```typescript
 * import { policy } from "repopo";
 * import { ExactScripts } from "repopo/policies";
 *
 * policy(ExactScripts, {
 *   scripts: {
 *     clean: "rimraf dist esm",
 *     format: "biome format --write .",
 *     lint: "biome lint .",
 *   },
 * })
 * ```
 *
 * @alpha
 */
export const ExactScripts = definePackagePolicy<
	PackageJson,
	ExactScriptsConfig | undefined
>({
	name: POLICY_NAME,
	description:
		"Validates that scripts exist and have exact content in package.json.",
	handler: async (json, { file, resolve, config }) => {
		if (config === undefined || Object.keys(config.scripts).length === 0) {
			return true;
		}

		const scripts = json.scripts ?? {};
		const validation = validateScripts(scripts, config.scripts);

		if (validation.errors.length === 0) {
			return true;
		}

		const scriptsToFix = [
			...validation.missingScripts,
			...validation.mismatchedScripts,
		];
		const hasAutoFixableErrors = scriptsToFix.length > 0;

		if (resolve && hasAutoFixableErrors) {
			try {
				const fixedScripts = await fixScripts(
					json,
					file,
					scriptsToFix,
					config.scripts,
					scripts,
				);

				return {
					name: POLICY_NAME,
					file,
					resolved: true,
					errorMessages: [`Fixed scripts: ${fixedScripts.join(", ")}`],
				};
			} catch {
				// Fall through to return regular failure
			}
		}

		return {
			name: POLICY_NAME,
			file,
			autoFixable: hasAutoFixableErrors,
			errorMessages: validation.errors,
		};
	},
});
