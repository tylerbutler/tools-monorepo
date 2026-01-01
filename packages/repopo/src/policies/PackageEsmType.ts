import jsonfile from "jsonfile";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

const { writeFile: writeJson } = jsonfile;

/**
 * Configuration for the PackageEsmType policy.
 *
 * This policy ensures the `type` field in package.json is correctly set
 * to indicate whether the package is an ESM or CommonJS module.
 *
 * @example
 * ```typescript
 * const config: PackageEsmTypeConfig = {
 *   // Require ESM type field for all packages
 *   requiredType: "module",
 *   // Or detect based on exports/main field
 *   detectFromExports: true,
 * };
 * ```
 *
 * @alpha
 */
export interface PackageEsmTypeConfig {
	/**
	 * The required `type` field value for all packages.
	 *
	 * - `"module"` - All packages must be ESM (use import/export)
	 * - `"commonjs"` - All packages must be CommonJS (use require)
	 * - `undefined` - Use detection logic based on exports/main
	 *
	 * @remarks
	 *
	 * If set, this overrides automatic detection. Use `detectFromExports`
	 * for more flexible per-package type detection.
	 */
	requiredType?: "module" | "commonjs";

	/**
	 * Detect the expected `type` field from the exports or main field.
	 *
	 * When enabled, the policy analyzes the package's entry points:
	 * - If exports use `.mjs` or have `import` conditions → `"module"`
	 * - If exports use `.cjs` or have `require` conditions → `"commonjs"`
	 * - If main field uses `.mjs` → `"module"`
	 * - If main field uses `.cjs` → `"commonjs"`
	 *
	 * @defaultValue false
	 */
	detectFromExports?: boolean;

	/**
	 * Package names or scopes to exclude from validation.
	 *
	 * @example
	 * ```typescript
	 * excludePackages: ["@myorg/legacy-package", "old-cjs-lib"]
	 * ```
	 */
	excludePackages?: string[];
}

/**
 * Detect the expected type field from the package's exports or main field.
 *
 * @param json - The package.json content
 * @returns The detected type or undefined if no clear indication
 */
function detectTypeFromPackage(
	json: PackageJson,
): "module" | "commonjs" | undefined {
	// Check exports field for type hints
	const exports = json.exports;
	if (exports !== undefined) {
		const exportsStr = JSON.stringify(exports);
		// Check for ESM indicators
		if (exportsStr.includes(".mjs") || exportsStr.includes('"import"')) {
			return "module";
		}
		// Check for CommonJS indicators
		if (exportsStr.includes(".cjs") || exportsStr.includes('"require"')) {
			return "commonjs";
		}
	}

	// Check main field
	const main = json.main;
	if (typeof main === "string") {
		if (main.endsWith(".mjs")) {
			return "module";
		}
		if (main.endsWith(".cjs")) {
			return "commonjs";
		}
	}

	// Check module field (ESM entry point)
	if (json.module !== undefined) {
		return "module";
	}

	return undefined;
}

/**
 * Check if a package matches an exclusion pattern.
 *
 * @param packageName - The package name
 * @param excludePackages - List of patterns to exclude
 * @returns true if the package should be excluded
 */
function isExcluded(
	packageName: string,
	excludePackages: string[] | undefined,
): boolean {
	if (excludePackages === undefined || excludePackages.length === 0) {
		return false;
	}

	for (const pattern of excludePackages) {
		// Scope matching
		if (pattern.startsWith("@") && packageName.startsWith(`${pattern}/`)) {
			return true;
		}
		// Exact match
		if (packageName === pattern) {
			return true;
		}
	}

	return false;
}

/**
 * A policy that ensures the `type` field in package.json is correctly set.
 *
 * This policy helps maintain consistency in how packages declare their module format,
 * which is essential for proper module resolution in Node.js and bundlers.
 *
 * @remarks
 *
 * The policy can operate in two modes:
 *
 * 1. **Required Type**: Set `requiredType` to enforce a specific type for all packages
 * 2. **Detection**: Set `detectFromExports: true` to detect the expected type from
 *    the package's exports or main field
 *
 * When `detectFromExports` is enabled, the policy looks for:
 * - `.mjs` extensions or `"import"` conditions → expects `"module"`
 * - `.cjs` extensions or `"require"` conditions → expects `"commonjs"`
 *
 * @example
 * ```typescript
 * import { makePolicy } from "repopo";
 * import { PackageEsmType } from "repopo/policies";
 *
 * // Require all packages to be ESM
 * makePolicy(PackageEsmType, { requiredType: "module" })
 *
 * // Or detect based on exports
 * makePolicy(PackageEsmType, { detectFromExports: true })
 * ```
 *
 * @alpha
 */
export const PackageEsmType = definePackagePolicy<
	PackageJson,
	PackageEsmTypeConfig | undefined
>("PackageEsmType", async (json, { file, config, resolve }) => {
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

	// Determine the expected type
	let expectedType: "module" | "commonjs" | undefined;

	if (config.requiredType !== undefined) {
		expectedType = config.requiredType;
	} else if (config.detectFromExports === true) {
		expectedType = detectTypeFromPackage(json);
	}

	// If we can't determine expected type, skip validation
	if (expectedType === undefined) {
		return true;
	}

	const currentType = json.type;

	// Check if current type matches expected
	if (currentType === expectedType) {
		return true;
	}

	// Build error message
	const failResult: PolicyFailure = {
		name: PackageEsmType.name,
		file,
		autoFixable: true,
	};

	if (currentType === undefined) {
		failResult.errorMessage = `Package "${packageName}" is missing the "type" field. Expected: "type": "${expectedType}"`;
	} else {
		failResult.errorMessage = `Package "${packageName}" has "type": "${currentType}" but expected "type": "${expectedType}"`;
	}

	if (resolve) {
		const fixResult: PolicyFixResult = {
			...failResult,
			resolved: false,
		};

		try {
			json.type = expectedType;
			await writeJson(file, json, { spaces: "\t" });
			fixResult.resolved = true;
		} catch {
			fixResult.resolved = false;
			fixResult.errorMessage = `Failed to update ${file}`;
		}

		return fixResult;
	}

	return failResult;
});
