import jsonfile from "jsonfile";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";
import { detectIndentation } from "../utils/indentation.js";

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

	/**
	 * Behavior when module type cannot be detected from exports/main.
	 *
	 * - `"skip"` (default) - Skip validation for packages where type cannot be detected
	 * - `"warn"` - Pass validation but include a warning in the output
	 * - `"fail"` - Fail validation when type cannot be detected
	 *
	 * This only applies when `detectFromExports` is true and no `requiredType` is set.
	 *
	 * @defaultValue "skip"
	 */
	onDetectionFailure?: "skip" | "warn" | "fail";
}

/**
 * Result of detecting the module type from a package.
 */
interface DetectionResult {
	/**
	 * The detected type, if any.
	 */
	type: "module" | "commonjs" | undefined;

	/**
	 * Whether the package appears to be dual-format (both ESM and CommonJS).
	 * When true, the `type` field should typically match the package's default format.
	 */
	isDualFormat: boolean;

	/**
	 * Human-readable reason for the detection result.
	 */
	reason: string;
}

/**
 * Detect module type from the exports field.
 */
function detectTypeFromExports(
	exports: PackageJson["exports"],
): DetectionResult | undefined {
	if (exports === undefined) {
		return undefined;
	}

	const exportsStr = JSON.stringify(exports);
	const hasEsm = exportsStr.includes(".mjs") || exportsStr.includes('"import"');
	const hasCjs =
		exportsStr.includes(".cjs") || exportsStr.includes('"require"');

	// Dual format packages have both ESM and CJS exports
	if (hasEsm && hasCjs) {
		return {
			type: "module",
			isDualFormat: true,
			reason:
				"Package has both ESM and CommonJS exports (dual format). Defaulting to ESM.",
		};
	}

	if (hasEsm) {
		return {
			type: "module",
			isDualFormat: false,
			reason: "Detected ESM from exports field (.mjs or import condition)",
		};
	}

	if (hasCjs) {
		return {
			type: "commonjs",
			isDualFormat: false,
			reason:
				"Detected CommonJS from exports field (.cjs or require condition)",
		};
	}

	return undefined;
}

/**
 * Detect module type from the main field.
 */
function detectTypeFromMain(main: unknown): DetectionResult | undefined {
	if (typeof main !== "string") {
		return undefined;
	}

	if (main.endsWith(".mjs")) {
		return {
			type: "module",
			isDualFormat: false,
			reason: "Detected ESM from main field (.mjs extension)",
		};
	}

	if (main.endsWith(".cjs")) {
		return {
			type: "commonjs",
			isDualFormat: false,
			reason: "Detected CommonJS from main field (.cjs extension)",
		};
	}

	return undefined;
}

/**
 * Detect the expected type field from the package's exports or main field.
 *
 * @param json - The package.json content
 * @returns Detection result with type, dual-format indicator, and reason
 */
function detectTypeFromPackage(json: PackageJson): DetectionResult {
	// Check exports field for type hints
	const exportsResult = detectTypeFromExports(json.exports);
	if (exportsResult !== undefined) {
		return exportsResult;
	}

	// Check main field
	const mainResult = detectTypeFromMain(json.main);
	if (mainResult !== undefined) {
		return mainResult;
	}

	// Check module field (ESM entry point)
	if (json.module !== undefined) {
		return {
			type: "module",
			isDualFormat: false,
			reason: "Detected ESM from module field presence",
		};
	}

	return {
		type: undefined,
		isDualFormat: false,
		reason: "Could not detect module type from exports, main, or module fields",
	};
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
 * Check if the package should be skipped from validation.
 */
function shouldSkipPackage(
	packageName: string | undefined,
	config: PackageEsmTypeConfig,
): boolean {
	// Skip packages without a name
	if (packageName === undefined) {
		return true;
	}

	// Skip the root package
	if (packageName === "root") {
		return true;
	}

	// Check exclusions
	return isExcluded(packageName, config.excludePackages);
}

/**
 * Determine the expected type and reason from the config and package.
 */
function determineExpectedType(
	json: PackageJson,
	config: PackageEsmTypeConfig,
): {
	expectedType: "module" | "commonjs" | undefined;
	detectionReason: string | undefined;
} {
	if (config.requiredType !== undefined) {
		return {
			expectedType: config.requiredType,
			detectionReason: `Required type: ${config.requiredType}`,
		};
	}

	if (config.detectFromExports === true) {
		const detection = detectTypeFromPackage(json);
		return {
			expectedType: detection.type,
			detectionReason: detection.reason,
		};
	}

	return { expectedType: undefined, detectionReason: undefined };
}

/**
 * Build the error message for a type mismatch.
 */
function buildErrorMessage(
	packageName: string,
	currentType: string | undefined,
	expectedType: string,
): string {
	if (currentType === undefined) {
		return `Package "${packageName}" is missing the "type" field. Expected: "type": "${expectedType}"`;
	}
	return `Package "${packageName}" has "type": "${currentType}" but expected "type": "${expectedType}"`;
}

/**
 * Apply the auto-fix for the type field.
 */
async function applyFix(
	json: PackageJson,
	file: string,
	expectedType: "module" | "commonjs",
	failResult: PolicyFailure,
): Promise<PolicyFixResult> {
	const fixResult: PolicyFixResult = {
		...failResult,
		resolved: false,
	};

	try {
		json.type = expectedType;
		const indent = await detectIndentation(file);
		await writeJson(file, json, { spaces: indent });
		fixResult.resolved = true;
	} catch {
		fixResult.resolved = false;
		fixResult.errorMessages = [`Failed to update ${file}`];
	}

	return fixResult;
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

	// Check if package should be skipped
	if (shouldSkipPackage(packageName, config)) {
		return true;
	}

	// Determine the expected type
	const { expectedType, detectionReason } = determineExpectedType(json, config);

	// Handle case where type cannot be detected
	if (expectedType === undefined) {
		if (config.onDetectionFailure === "fail") {
			return {
				name: "PackageEsmType",
				file,
				autoFixable: false,
				errorMessages: [
					`Package "${packageName}": ${detectionReason ?? "Could not detect module type"}. Set "type" field explicitly or use "requiredType" config.`,
				],
			};
		}
		// "skip" and "warn" both pass validation
		return true;
	}

	// Check if current type matches expected
	if (json.type === expectedType) {
		return true;
	}

	// Build failure result
	const failResult: PolicyFailure = {
		name: PackageEsmType.name,
		file,
		autoFixable: true,
		// packageName is guaranteed to be defined here due to shouldSkipPackage check
		errorMessages: [
			buildErrorMessage(packageName as string, json.type, expectedType),
		],
	};

	if (resolve) {
		return applyFix(json, file, expectedType, failResult);
	}

	return failResult;
});
