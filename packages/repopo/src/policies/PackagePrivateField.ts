import jsonfile from "jsonfile";
import picomatch from "picomatch";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

const { writeFile: writeJson } = jsonfile;

/**
 * Sentinel value indicating that the package's private status should not be enforced.
 * This is more explicit than using `undefined` to represent "ignore".
 */
const IGNORE_PRIVATE_STATE = "ignore" as const;

/**
 * The required private state for a package.
 * - `true`: Package must have `private: true`
 * - `false`: Package must NOT have `private: true`
 * - `"ignore"`: No enforcement - package can be either private or public
 */
type RequiredPrivateState = boolean | typeof IGNORE_PRIVATE_STATE;

/**
 * Configuration for the PackagePrivateField policy.
 *
 * This policy enforces that packages are correctly marked as private or public based on
 * their scope or name. This is essential for monorepos where some packages should be
 * published to npm while others should remain internal.
 *
 * All pattern matching uses glob patterns via picomatch.
 *
 * @example
 * ```typescript
 * const config: PackagePrivateFieldConfig = {
 *   // Packages in myorg scope must be published (private: false or absent)
 *   mustPublish: ["@myorg/*"],
 *   // Packages in internal scope must be private
 *   mustBePrivate: ["@internal/*"],
 *   // Packages in experimental scope can choose
 *   mayPublish: ["@experimental/*"],
 * };
 * ```
 *
 * @alpha
 */
export interface PackagePrivateFieldConfig {
	/**
	 * A list of glob patterns for packages that must be published.
	 *
	 * Packages matching these patterns must NOT have `private: true` in their package.json.
	 * If they do, the policy will fail and can auto-fix by removing the private field.
	 *
	 * @remarks
	 *
	 * Uses glob patterns via picomatch. Use "@scope/*" to match all packages in a scope,
	 * or use exact package names.
	 *
	 * @example
	 * ```typescript
	 * mustPublish: ["@fluidframework/*", "@fluid-tools/*", "tinylicious"]
	 * ```
	 */
	mustPublish?: string[];

	/**
	 * A list of glob patterns for packages that must be private.
	 *
	 * Packages matching these patterns must have `private: true` in their package.json.
	 * If they don't, the policy will fail and can auto-fix by adding `private: true`.
	 *
	 * @remarks
	 *
	 * Uses glob patterns via picomatch (see mustPublish for pattern examples).
	 *
	 * @example
	 * ```typescript
	 * mustBePrivate: ["@fluid-internal/*", "@fluid-private/*"]
	 * ```
	 */
	mustBePrivate?: string[];

	/**
	 * A list of glob patterns for packages that may optionally be published.
	 *
	 * Packages matching these patterns can choose whether to be private or public.
	 * The policy will not enforce either state for these packages.
	 *
	 * @remarks
	 *
	 * Uses glob patterns via picomatch (see mustPublish for pattern examples).
	 * Packages not matching any list default to requiring `private: true`.
	 *
	 * @example
	 * ```typescript
	 * mayPublish: ["@fluid-experimental/*"]
	 * ```
	 */
	mayPublish?: string[];

	/**
	 * Default behavior for packages that don't match any of the above lists.
	 *
	 * - `"private"` (default): Unmatched packages must have `private: true`
	 * - `"public"`: Unmatched packages must NOT have `private: true`
	 * - `"ignore"`: No enforcement for unmatched packages
	 *
	 * @defaultValue "private"
	 */
	unmatchedPackages?: "private" | "public" | "ignore";
}

/**
 * Check if a package name matches any pattern in the list.
 *
 * Supports glob patterns via picomatch. Use patterns like:
 * - "@myorg/\*" - matches all packages in the myorg scope
 * - "my-package" - exact match
 * - "my-*" - matches my-foo, my-bar, etc.
 *
 * @param packageName - The package name to check (e.g., `@myorg/foo`)
 * @param patterns - List of glob patterns or exact package names
 * @returns `true` if the package matches any pattern
 */
function matchesAnyPattern(
	packageName: string,
	patterns: string[] | undefined,
): boolean {
	if (patterns === undefined || patterns.length === 0) {
		return false;
	}

	return picomatch.isMatch(packageName, patterns);
}

/**
 * Determine what the private field should be for a package.
 *
 * @returns `true` if package must be private, `false` if must be public, `"ignore"` if either is ok
 */
function getRequiredPrivateState(
	packageName: string,
	config: PackagePrivateFieldConfig,
): RequiredPrivateState {
	// Check mustPublish first - these packages must NOT be private
	if (matchesAnyPattern(packageName, config.mustPublish)) {
		return false;
	}

	// Check mustBePrivate - these packages MUST be private
	if (matchesAnyPattern(packageName, config.mustBePrivate)) {
		return true;
	}

	// Check mayPublish - these packages can be either
	if (matchesAnyPattern(packageName, config.mayPublish)) {
		return IGNORE_PRIVATE_STATE;
	}

	// Default behavior for unmatched packages
	const unmatchedBehavior = config.unmatchedPackages ?? "private";
	switch (unmatchedBehavior) {
		case "private":
			return true;
		case "public":
			return false;
		case "ignore":
			return IGNORE_PRIVATE_STATE;
		default:
			throw new Error(`Unknown unmatchedPackages value: ${unmatchedBehavior}`);
	}
}

/**
 * A policy that enforces the `private` field in package.json based on package scope or name.
 *
 * This policy is essential for monorepos where publishing control is important:
 *
 * - Prevent accidental publishing of internal packages
 * - Ensure public packages don't have `private: true` blocking publishing
 * - Allow experimental packages to choose their own publishing status
 *
 * @remarks
 *
 * The policy evaluates packages in the following order:
 *
 * 1. If the package matches `mustPublish`, it must NOT have `private: true`
 * 2. If the package matches `mustBePrivate`, it MUST have `private: true`
 * 3. If the package matches `mayPublish`, no enforcement is applied
 * 4. Otherwise, the `unmatchedPackages` setting determines behavior (defaults to requiring private)
 *
 * @example
 * ```typescript
 * import { makePolicy } from "repopo";
 * import { PackagePrivateField } from "repopo/policies";
 *
 * const config: RepopoConfig = {
 *   policies: [
 *     makePolicy(PackagePrivateField, {
 *       mustPublish: ["@myorg/*"],
 *       mustBePrivate: ["@internal/*"],
 *       mayPublish: ["@experimental/*"],
 *       unmatchedPackages: "private",
 *     }),
 *   ],
 * };
 * ```
 *
 * @alpha
 */
export const PackagePrivateField = definePackagePolicy<
	PackageJson,
	PackagePrivateFieldConfig | undefined
>("PackagePrivateField", async (json, { file, config, resolve }) => {
	// If no config provided, skip validation
	if (config === undefined) {
		return true;
	}

	const packageName = json.name;

	// Skip packages without a name (shouldn't happen in practice)
	if (packageName === undefined) {
		return true;
	}

	// Skip the root package (typically named "root" in monorepos)
	if (packageName === "root") {
		return true;
	}

	const requiredState = getRequiredPrivateState(packageName, config);

	// If "ignore", the package can be either private or public
	if (requiredState === IGNORE_PRIVATE_STATE) {
		return true;
	}

	const currentlyPrivate = json.private === true;

	// Check if the current state matches the required state
	if (requiredState === currentlyPrivate) {
		return true;
	}

	// State mismatch - build error message
	const failResult: PolicyFailure = {
		name: PackagePrivateField.name,
		file,
		autoFixable: true,
	};

	if (requiredState === true) {
		// Package should be private but isn't
		failResult.errorMessage = `Package "${packageName}" must be marked private. Add "private": true to package.json.`;
	} else {
		// Package should be public but is private
		failResult.errorMessage = `Package "${packageName}" must not be marked private. Remove "private": true from package.json to allow publishing.`;
	}

	if (resolve) {
		const fixResult: PolicyFixResult = {
			...failResult,
			resolved: false,
		};

		try {
			if (requiredState === true) {
				// Add private: true
				json.private = true;
			} else {
				// Remove private field
				delete json.private;
			}

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
