import jsonfile from "jsonfile";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

const { writeFile: writeJson } = jsonfile;

/**
 * Configuration for the PackagePrivateField policy.
 *
 * This policy enforces that packages are correctly marked as private or public based on
 * their scope or name. This is essential for monorepos where some packages should be
 * published to npm while others should remain internal.
 *
 * @example
 * ```typescript
 * const config: PackagePrivateFieldConfig = {
 *   // Packages in @myorg scope must be published (private: false or absent)
 *   mustPublish: ["@myorg"],
 *   // Packages in @internal scope must be private
 *   mustBePrivate: ["@internal"],
 *   // Packages in @experimental scope can choose
 *   mayPublish: ["@experimental"],
 * };
 * ```
 *
 * @alpha
 */
export interface PackagePrivateFieldConfig {
	/**
	 * A list of package scopes or exact package names that must be published.
	 *
	 * Packages matching these patterns must NOT have `private: true` in their package.json.
	 * If they do, the policy will fail and can auto-fix by removing the private field.
	 *
	 * @remarks
	 *
	 * - Scopes should start with `@` (e.g., `@myorg`)
	 * - Exact package names can be specified (e.g., `my-package`)
	 * - A scope matches any package within it (e.g., `@myorg` matches `@myorg/foo`)
	 *
	 * @example
	 * ```typescript
	 * mustPublish: ["@fluidframework", "@fluid-tools", "tinylicious"]
	 * ```
	 */
	mustPublish?: string[];

	/**
	 * A list of package scopes or exact package names that must be private.
	 *
	 * Packages matching these patterns must have `private: true` in their package.json.
	 * If they don't, the policy will fail and can auto-fix by adding `private: true`.
	 *
	 * @remarks
	 *
	 * - Scopes should start with `@` (e.g., `@internal`)
	 * - Exact package names can be specified (e.g., `my-internal-package`)
	 * - A scope matches any package within it
	 *
	 * @example
	 * ```typescript
	 * mustBePrivate: ["@fluid-internal", "@fluid-private"]
	 * ```
	 */
	mustBePrivate?: string[];

	/**
	 * A list of package scopes or exact package names that may optionally be published.
	 *
	 * Packages matching these patterns can choose whether to be private or public.
	 * The policy will not enforce either state for these packages.
	 *
	 * @remarks
	 *
	 * - Use this for experimental packages that might be published later
	 * - Packages not matching any list default to requiring `private: true`
	 *
	 * @example
	 * ```typescript
	 * mayPublish: ["@fluid-experimental"]
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
 * @param packageName - The package name to check (e.g., `@myorg/foo`)
 * @param patterns - List of scopes or exact package names
 * @returns `true` if the package matches any pattern
 */
function matchesAnyPattern(
	packageName: string,
	patterns: string[] | undefined,
): boolean {
	if (patterns === undefined || patterns.length === 0) {
		return false;
	}

	for (const pattern of patterns) {
		// If the pattern starts with @, treat it as a scope
		if (pattern.startsWith("@")) {
			// Match packages in this scope (e.g., @myorg matches @myorg/foo)
			if (packageName.startsWith(`${pattern}/`)) {
				return true;
			}
		}

		// Exact match
		if (packageName === pattern) {
			return true;
		}
	}

	return false;
}

/**
 * Determine what the private field should be for a package.
 *
 * @returns `true` if package must be private, `false` if must be public, `undefined` if either is ok
 */
function getRequiredPrivateState(
	packageName: string,
	config: PackagePrivateFieldConfig,
): boolean | undefined {
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
		return undefined;
	}

	// Default behavior for unmatched packages
	const unmatchedBehavior = config.unmatchedPackages ?? "private";
	switch (unmatchedBehavior) {
		case "private":
			return true;
		case "public":
			return false;
		case "ignore":
			return undefined;
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
 *       mustPublish: ["@myorg"],
 *       mustBePrivate: ["@internal"],
 *       mayPublish: ["@experimental"],
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

	// If undefined, the package can be either private or public
	if (requiredState === undefined) {
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
