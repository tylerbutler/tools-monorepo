import type { PackageJson } from "type-fest";
import type { PolicyFailure } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * Configuration for the PackageFormatScripts policy.
 *
 * This policy ensures that format and check scripts use the expected
 * formatting tools (prettier, biome, etc.) consistently across packages.
 *
 * @example
 * ```typescript
 * const config: PackageFormatScriptsConfig = {
 *   // Scripts to validate
 *   scripts: {
 *     "format": { mustContain: ["prettier --write", "biome format --write"] },
 *     "check:format": { mustContain: ["prettier --check", "biome check"] },
 *   },
 *   // Only require if format tools are in devDependencies
 *   requireIfDependencyPresent: ["prettier", "@biomejs/biome"],
 * };
 * ```
 *
 * @alpha
 */
export interface PackageFormatScriptsConfig {
	/**
	 * Map of script names to their validation rules.
	 *
	 * Each entry defines a script name and what patterns must be present.
	 */
	scripts?: Record<string, FormatScriptRule>;

	/**
	 * Only enforce script rules if one of these dependencies is present in devDependencies.
	 *
	 * This allows the policy to only apply to packages that actually use formatting tools.
	 *
	 * @example
	 * ```typescript
	 * requireIfDependencyPresent: ["prettier", "@biomejs/biome"]
	 * ```
	 */
	requireIfDependencyPresent?: string[];

	/**
	 * Always require the specified scripts regardless of dependencies.
	 *
	 * @defaultValue false
	 */
	alwaysRequire?: boolean;

	/**
	 * Package names or scopes to exclude from validation.
	 */
	excludePackages?: string[];
}

/**
 * Rule for validating a format script.
 */
export interface FormatScriptRule {
	/**
	 * At least one of these patterns must be present in the script.
	 *
	 * @example
	 * ```typescript
	 * mustContain: ["prettier --write", "biome format"]
	 * ```
	 */
	mustContain?: string[];

	/**
	 * None of these patterns should be present in the script.
	 *
	 * @example
	 * ```typescript
	 * mustNotContain: ["eslint --fix"]
	 * ```
	 */
	mustNotContain?: string[];

	/**
	 * If true, the script is required to exist.
	 * If false, only validate if the script exists.
	 *
	 * @defaultValue false
	 */
	required?: boolean;
}

/**
 * Check if a package should be excluded from validation.
 */
function isExcluded(
	packageName: string,
	excludePackages: string[] | undefined,
): boolean {
	if (excludePackages === undefined || excludePackages.length === 0) {
		return false;
	}

	for (const pattern of excludePackages) {
		if (pattern.startsWith("@") && packageName.startsWith(`${pattern}/`)) {
			return true;
		}
		if (packageName === pattern) {
			return true;
		}
	}

	return false;
}

/**
 * Check if any of the specified dependencies are present.
 */
function hasFormatDependency(
	devDependencies: Record<string, string> | undefined,
	formatDeps: string[],
): boolean {
	if (devDependencies === undefined || formatDeps.length === 0) {
		return false;
	}

	for (const dep of formatDeps) {
		if (devDependencies[dep] !== undefined) {
			return true;
		}
	}
	return false;
}

/**
 * A policy that validates format and check scripts in package.json.
 *
 * This policy ensures consistency in how packages define their formatting scripts,
 * which is important for:
 *
 * - Consistent formatting across the monorepo
 * - Proper CI/CD validation
 * - Developer experience (predictable script names)
 *
 * @remarks
 *
 * The policy can validate:
 *
 * 1. **Script presence**: Whether specific scripts exist
 * 2. **Required patterns**: What the script must contain
 * 3. **Forbidden patterns**: What the script must not contain
 *
 * @example
 * ```typescript
 * import { makePolicy } from "repopo";
 * import { PackageFormatScripts } from "repopo/policies";
 *
 * const config: RepopoConfig = {
 *   policies: [
 *     makePolicy(PackageFormatScripts, {
 *       scripts: {
 *         "format": {
 *           mustContain: ["prettier --write"],
 *           required: true,
 *         },
 *         "check:format": {
 *           mustContain: ["prettier --check"],
 *         },
 *       },
 *       requireIfDependencyPresent: ["prettier"],
 *     }),
 *   ],
 * };
 * ```
 *
 * @alpha
 */
export const PackageFormatScripts = definePackagePolicy<
	PackageJson,
	PackageFormatScriptsConfig | undefined
>("PackageFormatScripts", async (json, { file, config }) => {
	// If no config provided, skip validation
	if (config === undefined) {
		return true;
	}

	const packageName = json.name;

	// Skip packages without a name
	if (packageName === undefined) {
		return true;
	}

	// Skip the root package
	if (packageName === "root") {
		return true;
	}

	// Check exclusions
	if (isExcluded(packageName, config.excludePackages)) {
		return true;
	}

	// Check if formatting is expected for this package
	const devDeps = json.devDependencies as Record<string, string> | undefined;
	const hasFormatDep = hasFormatDependency(
		devDeps,
		config.requireIfDependencyPresent ?? [],
	);

	// If not always required and no format dependency, skip
	if (config.alwaysRequire !== true && !hasFormatDep) {
		return true;
	}

	// No scripts to validate
	if (
		config.scripts === undefined ||
		Object.keys(config.scripts).length === 0
	) {
		return true;
	}

	const scripts = json.scripts ?? {};
	const errors: string[] = [];

	// Validate each configured script
	for (const [scriptName, rule] of Object.entries(config.scripts)) {
		const scriptContent = scripts[scriptName];

		// Check if script exists when required
		if (scriptContent === undefined) {
			if (rule.required === true) {
				errors.push(`Missing required script "${scriptName}"`);
			}
			continue;
		}

		// Validate mustContain patterns
		if (rule.mustContain !== undefined && rule.mustContain.length > 0) {
			const hasPattern = rule.mustContain.some((pattern) =>
				scriptContent.includes(pattern),
			);
			if (!hasPattern) {
				errors.push(
					`Script "${scriptName}" must contain one of: ${rule.mustContain.join(", ")}`,
				);
			}
		}

		// Validate mustNotContain patterns
		if (rule.mustNotContain !== undefined) {
			for (const pattern of rule.mustNotContain) {
				if (scriptContent.includes(pattern)) {
					errors.push(`Script "${scriptName}" must not contain: ${pattern}`);
				}
			}
		}
	}

	if (errors.length === 0) {
		return true;
	}

	const failResult: PolicyFailure = {
		name: PackageFormatScripts.name,
		file,
		autoFixable: false,
		errorMessage: `Package "${packageName}" has format script issues:\n  - ${errors.join("\n  - ")}`,
	};

	return failResult;
});
