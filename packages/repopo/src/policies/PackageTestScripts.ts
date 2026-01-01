import { existsSync } from "node:fs";
import path from "node:path";
import type { PackageJson } from "type-fest";
import type { PolicyFailure } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * Configuration for the PackageTestScripts policy.
 *
 * This policy ensures that packages have appropriate test scripts when they
 * contain test files or have test-related dependencies.
 *
 * @example
 * ```typescript
 * const config: PackageTestScriptsConfig = {
 *   // Check for these test directories
 *   testDirectories: ["test", "tests", "__tests__"],
 *   // Require test script if these devDependencies exist
 *   testDependencies: ["vitest", "jest", "mocha"],
 *   // Required test script names
 *   requiredScripts: ["test"],
 * };
 * ```
 *
 * @alpha
 */
export interface PackageTestScriptsConfig {
	/**
	 * Directory names that indicate test files are present.
	 *
	 * If any of these directories exist relative to the package.json,
	 * the policy will require test scripts to be present.
	 *
	 * @defaultValue ["test", "tests", "__tests__"]
	 */
	testDirectories?: string[];

	/**
	 * Test framework dependencies that indicate tests are expected.
	 *
	 * If any of these appear in devDependencies, the policy will require
	 * test scripts to be present.
	 *
	 * @example
	 * ```typescript
	 * testDependencies: ["vitest", "jest", "mocha", "@jest/globals"]
	 * ```
	 */
	testDependencies?: string[];

	/**
	 * Script names that must exist when tests are detected.
	 *
	 * @defaultValue ["test"]
	 */
	requiredScripts?: string[];

	/**
	 * If true, only check packages that have test directories.
	 * If false, also check packages with test dependencies.
	 *
	 * @defaultValue false
	 */
	onlyCheckDirectories?: boolean;

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
 * Check if any test directories exist.
 */
function hasTestDirectory(
	packageDir: string,
	testDirectories: string[],
): boolean {
	for (const testDir of testDirectories) {
		const testPath = path.join(packageDir, testDir);
		if (existsSync(testPath)) {
			return true;
		}
	}
	return false;
}

/**
 * Check if any test dependencies are present.
 */
function hasTestDependency(
	devDependencies: Record<string, string> | undefined,
	testDependencies: string[],
): boolean {
	if (devDependencies === undefined) {
		return false;
	}

	for (const dep of testDependencies) {
		if (devDependencies[dep] !== undefined) {
			return true;
		}
	}
	return false;
}

/**
 * A policy that ensures packages have test scripts when test files exist.
 *
 * This policy helps maintain testing discipline by requiring test scripts
 * for packages that have test directories or test framework dependencies.
 *
 * @remarks
 *
 * The policy detects that tests are expected based on:
 *
 * 1. **Test directories**: If `test/`, `tests/`, or `__tests__/` exists
 * 2. **Test dependencies**: If vitest, jest, mocha, etc. are in devDependencies
 *
 * When tests are detected, the policy requires specified test scripts to exist.
 *
 * @example
 * ```typescript
 * import { makePolicy } from "repopo";
 * import { PackageTestScripts } from "repopo/policies";
 *
 * const config: RepopoConfig = {
 *   policies: [
 *     makePolicy(PackageTestScripts, {
 *       testDirectories: ["test", "tests"],
 *       testDependencies: ["vitest", "jest"],
 *       requiredScripts: ["test"],
 *     }),
 *   ],
 * };
 * ```
 *
 * @alpha
 */
export const PackageTestScripts = definePackagePolicy<
	PackageJson,
	PackageTestScriptsConfig | undefined
>("PackageTestScripts", async (json, { file, config }) => {
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

	// Get defaults
	const testDirectories = config.testDirectories ?? [
		"test",
		"tests",
		"__tests__",
	];
	const testDependencies = config.testDependencies ?? [];
	const requiredScripts = config.requiredScripts ?? ["test"];
	const onlyCheckDirectories = config.onlyCheckDirectories ?? false;

	// Determine the package directory
	const packageDir = path.dirname(file);

	// Check if tests are expected
	const hasTestDir = hasTestDirectory(packageDir, testDirectories);
	const hasTestDep =
		!onlyCheckDirectories &&
		hasTestDependency(
			json.devDependencies as Record<string, string> | undefined,
			testDependencies,
		);

	// If no tests expected, pass
	if (!hasTestDir && !hasTestDep) {
		return true;
	}

	// Tests are expected - check for required scripts
	const scripts = json.scripts ?? {};
	const missingScripts: string[] = [];

	for (const scriptName of requiredScripts) {
		if (scripts[scriptName] === undefined) {
			missingScripts.push(scriptName);
		}
	}

	if (missingScripts.length === 0) {
		return true;
	}

	// Build error message
	const reason = hasTestDir
		? `test directory exists`
		: `test dependencies found (${testDependencies.filter((d) => (json.devDependencies as Record<string, string> | undefined)?.[d] !== undefined).join(", ")})`;

	const failResult: PolicyFailure = {
		name: PackageTestScripts.name,
		file,
		autoFixable: false,
		errorMessage: `Package "${packageName}" has ${reason} but is missing test scripts: ${missingScripts.join(", ")}`,
	};

	return failResult;
});
