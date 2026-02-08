import type { PackageJson } from "type-fest";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * Configuration for validating that a script's body contains required substrings.
 *
 * @alpha
 */
export interface ScriptContainsRule {
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
 * Configuration for the ScriptContains policy.
 *
 * @alpha
 */
export interface ScriptContainsConfig {
	/**
	 * Rules for validating script body content.
	 *
	 * @example
	 * ```typescript
	 * rules: [
	 *   { script: "clean", mustContain: ["rimraf"] },
	 *   { script: "build", mustContain: ["tsc"] },
	 * ]
	 * ```
	 */
	rules: ScriptContainsRule[];
}

const POLICY_NAME = "ScriptContains";

/**
 * A policy that validates script bodies contain required substrings.
 *
 * @remarks
 * Use this policy to ensure specific scripts contain required commands or patterns
 * without requiring an exact match. For example, requiring that the "clean" script
 * uses "rimraf" or that "build" includes "tsc".
 *
 * The policy only validates scripts that exist. If a script doesn't exist,
 * it's not an error (use RequiredScripts for that).
 *
 * @example
 * ```typescript
 * import { policy } from "repopo";
 * import { ScriptContains } from "repopo/policies";
 *
 * policy(ScriptContains, {
 *   rules: [
 *     { script: "clean", mustContain: ["rimraf"] },
 *     { script: "build", mustContain: ["tsc"] },
 *     { script: "test", mustContain: ["vitest", "run"] },
 *   ],
 * })
 * ```
 *
 * @alpha
 */
export const ScriptContains = definePackagePolicy<
	PackageJson,
	ScriptContainsConfig | undefined
>({
	name: POLICY_NAME,
	description: "Validates that script bodies contain required substrings.",
	handler: async (json, { file, config }) => {
		if (config === undefined || config.rules.length === 0) {
			return true;
		}

		const scripts = json.scripts ?? {};
		const errors: string[] = [];

		for (const rule of config.rules) {
			// Only validate if the script exists
			if (Object.hasOwn(scripts, rule.script)) {
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

		if (errors.length === 0) {
			return true;
		}

		return {
			name: POLICY_NAME,
			file,
			autoFixable: false,
			errorMessages: errors,
		};
	},
});
