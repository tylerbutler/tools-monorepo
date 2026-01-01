import type { PackageJson } from "type-fest";
import type { PolicyFailure } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * Configuration for the PackageCleanScript policy.
 *
 * This policy ensures that packages have a proper `clean` script that removes
 * all build outputs, enabling reliable clean rebuilds.
 *
 * @example
 * ```typescript
 * const config: PackageCleanScriptConfig = {
 *   // Require these directories to be cleaned
 *   requiredCleanDirs: ["dist", "esm", "lib"],
 *   // These patterns must appear in the clean script
 *   requiredPatterns: ["rimraf", "rm -rf"],
 *   // Script must use one of these tools
 *   allowedTools: ["rimraf", "del-cli", "rm"],
 * };
 * ```
 *
 * @alpha
 */
export interface PackageCleanScriptConfig {
	/**
	 * List of directory names that must be included in the clean script.
	 *
	 * The policy will check that the clean script references these directories.
	 * Directories are matched as substrings, so `"dist"` matches both `dist` and `./dist`.
	 *
	 * @example
	 * ```typescript
	 * requiredCleanDirs: ["dist", "esm", "lib", ".coverage"]
	 * ```
	 */
	requiredCleanDirs?: string[];

	/**
	 * Patterns that must appear in the clean script.
	 *
	 * At least one of these patterns must be present in the script.
	 * Use this to enforce specific cleanup tools.
	 *
	 * @example
	 * ```typescript
	 * // Require rimraf or native rm
	 * requiredPatterns: ["rimraf", "rm -rf"]
	 * ```
	 */
	requiredPatterns?: string[];

	/**
	 * If true, require that a clean script exists.
	 * If false, only validate the clean script if it exists.
	 *
	 * @defaultValue false
	 */
	requireCleanScript?: boolean;

	/**
	 * Package names or scopes to exclude from validation.
	 */
	excludePackages?: string[];
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
 * A policy that validates the `clean` script in package.json.
 *
 * This policy ensures that packages have a proper clean script that removes
 * all build artifacts. A proper clean script is essential for:
 *
 * - Reliable clean rebuilds
 * - Avoiding stale build artifacts
 * - Consistent CI/CD behavior
 *
 * @remarks
 *
 * The policy can enforce:
 *
 * 1. **Required directories**: Specific directories must be mentioned in the clean script
 * 2. **Required patterns**: At least one of the specified patterns must be present
 * 3. **Script presence**: Whether a clean script is required
 *
 * @example
 * ```typescript
 * import { makePolicy } from "repopo";
 * import { PackageCleanScript } from "repopo/policies";
 *
 * const config: RepopoConfig = {
 *   policies: [
 *     makePolicy(PackageCleanScript, {
 *       requireCleanScript: true,
 *       requiredCleanDirs: ["dist", "esm", "lib"],
 *       requiredPatterns: ["rimraf"],
 *     }),
 *   ],
 * };
 * ```
 *
 * @alpha
 */
export const PackageCleanScript = definePackagePolicy<
	PackageJson,
	PackageCleanScriptConfig | undefined
>("PackageCleanScript", async (json, { file, config }) => {
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

	const scripts = json.scripts;
	const cleanScript = scripts?.clean;

	// Check if clean script exists
	if (cleanScript === undefined) {
		if (config.requireCleanScript === true) {
			const failResult: PolicyFailure = {
				name: PackageCleanScript.name,
				file,
				autoFixable: false,
				errorMessage: `Package "${packageName}" is missing a "clean" script`,
			};
			return failResult;
		}
		// Script not required and not present, that's OK
		return true;
	}

	// Validate required directories
	if (config.requiredCleanDirs !== undefined) {
		const missingDirs: string[] = [];
		for (const dir of config.requiredCleanDirs) {
			if (!cleanScript.includes(dir)) {
				missingDirs.push(dir);
			}
		}

		if (missingDirs.length > 0) {
			const failResult: PolicyFailure = {
				name: PackageCleanScript.name,
				file,
				autoFixable: false,
				errorMessage: `Package "${packageName}" clean script is missing required directories: ${missingDirs.join(", ")}. Current script: "${cleanScript}"`,
			};
			return failResult;
		}
	}

	// Validate required patterns
	if (
		config.requiredPatterns !== undefined &&
		config.requiredPatterns.length > 0
	) {
		const hasRequiredPattern = config.requiredPatterns.some((pattern) =>
			cleanScript.includes(pattern),
		);

		if (!hasRequiredPattern) {
			const failResult: PolicyFailure = {
				name: PackageCleanScript.name,
				file,
				autoFixable: false,
				errorMessage: `Package "${packageName}" clean script must use one of: ${config.requiredPatterns.join(", ")}. Current script: "${cleanScript}"`,
			};
			return failResult;
		}
	}

	return true;
});
