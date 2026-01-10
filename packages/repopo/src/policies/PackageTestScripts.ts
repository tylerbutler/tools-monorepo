import { existsSync } from "node:fs";
import { dirname, join } from "pathe";
import type { PackageJson } from "type-fest";
import type { PolicyFailure } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * Configuration for the PackageTestScripts policy.
 *
 * This policy ensures that packages have appropriate test scripts when they
 * contain test files or have test-related dependencies.
 *
 * The policy automatically determines what to check based on what's configured:
 * - If `testDirectories` is set, checks for test directories
 * - If `testDependencies` is set, checks for test dependencies
 * - If both are set, a package triggers validation if either condition is met
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
	 * If not set or empty, directory checking is skipped.
	 *
	 * @example
	 * ```typescript
	 * testDirectories: ["test", "tests", "__tests__"]
	 * ```
	 */
	testDirectories?: string[];

	/**
	 * Test framework dependencies that indicate tests are expected.
	 *
	 * If any of these appear in devDependencies, the policy will require
	 * test scripts to be present.
	 *
	 * If not set or empty, dependency checking is skipped.
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
		const testPath = join(packageDir, testDir);
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

	return testDependencies.some((dep) => devDependencies[dep] !== undefined);
}

/**
 * Find missing scripts from the required list.
 */
function findMissingScripts(
	scripts: PackageJson["scripts"],
	requiredScripts: string[],
): string[] {
	return requiredScripts.filter(
		(scriptName) => scripts?.[scriptName] === undefined,
	);
}

/**
 * Get the list of test dependencies that are present in devDependencies.
 */
function getPresentTestDependencies(
	devDependencies: Record<string, string> | undefined,
	testDependencies: string[],
): string[] {
	if (devDependencies === undefined) {
		return [];
	}
	return testDependencies.filter((d) => devDependencies[d] !== undefined);
}

/**
 * Check if a package should be validated based on config and package properties.
 */
function shouldSkipValidation(
	json: PackageJson,
	config: PackageTestScriptsConfig,
): boolean {
	const packageName = json.name;

	// Skip packages without a name or root package
	if (packageName === undefined || packageName === "root") {
		return true;
	}

	// Check exclusions
	if (isExcluded(packageName, config.excludePackages)) {
		return true;
	}

	// Skip if neither directories nor dependencies are configured
	const testDirectories = config.testDirectories ?? [];
	const testDependencies = config.testDependencies ?? [];

	return testDirectories.length === 0 && testDependencies.length === 0;
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

	// Skip validation based on package properties and config
	if (shouldSkipValidation(json, config)) {
		return true;
	}

	// Get config values
	const testDirectories = config.testDirectories ?? [];
	const testDependencies = config.testDependencies ?? [];
	const requiredScripts = config.requiredScripts ?? ["test"];
	const packageDir = dirname(file);
	const devDeps = json.devDependencies as Record<string, string> | undefined;

	// Check if tests are expected based on what's configured
	const hasTestDir =
		testDirectories.length > 0 && hasTestDirectory(packageDir, testDirectories);
	const hasTestDep =
		testDependencies.length > 0 && hasTestDependency(devDeps, testDependencies);

	// If no tests expected based on configured checks, pass
	if (!(hasTestDir || hasTestDep)) {
		return true;
	}

	// Tests are expected - check for required scripts
	const missingScripts = findMissingScripts(json.scripts, requiredScripts);

	if (missingScripts.length === 0) {
		return true;
	}

	// Build error message
	const reason = hasTestDir
		? "test directory exists"
		: `test dependencies found (${getPresentTestDependencies(devDeps, testDependencies).join(", ")})`;

	const failResult: PolicyFailure = {
		name: PackageTestScripts.name,
		file,
		autoFixable: false,
		errorMessage: `Package "${json.name}" has ${reason} but is missing test scripts: ${missingScripts.join(", ")}`,
	};

	return failResult;
});
