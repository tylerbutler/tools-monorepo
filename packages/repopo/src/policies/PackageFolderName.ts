import path from "node:path";
import picomatch from "picomatch";
import type { PackageJson } from "type-fest";
import type { PolicyFailure } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * Configuration for the PackageFolderName policy.
 *
 * This policy ensures that package folder names match their package names,
 * promoting consistency and making packages easier to find in the file system.
 *
 * @example
 * ```typescript
 * const config: PackageFolderNameConfig = {
 *   // Strip all scopes when matching folder names
 *   stripScopes: ["@*"],
 *   // Or strip specific scopes
 *   stripScopes: ["@myorg", "@internal"],
 *   // These packages are exempt from the check
 *   excludePackages: ["@myorg/special-name"],
 * };
 * ```
 *
 * @alpha
 */
export interface PackageFolderNameConfig {
	/**
	 * A list of npm scope patterns to strip when comparing folder names to package names.
	 *
	 * For scoped packages like `@myorg/my-package`, if `@myorg` matches a pattern in this list,
	 * the policy will expect the folder to be named `my-package` (not `@myorg/my-package`).
	 *
	 * @remarks
	 *
	 * Supports glob patterns:
	 * - `@*` - matches all scopes
	 * - `@myorg` - matches exactly `@myorg`
	 * - `@my*` - matches scopes starting with `@my`
	 *
	 * @example
	 * ```typescript
	 * // Strip all scopes - @anything/my-package → folder "my-package"
	 * stripScopes: ["@*"]
	 *
	 * // Strip specific scopes only
	 * stripScopes: ["@myorg", "@internal"]
	 *
	 * // Strip scopes matching a pattern
	 * stripScopes: ["@fluid*"]
	 * ```
	 */
	stripScopes?: string[];

	/**
	 * A list of package names that are exempt from folder name matching.
	 *
	 * Use this for packages that intentionally have different folder names,
	 * such as legacy packages or packages with special naming requirements.
	 *
	 * @example
	 * ```typescript
	 * excludePackages: ["@myorg/cli", "legacy-package"]
	 * ```
	 */
	excludePackages?: string[];
}

/**
 * Check if a scope should be stripped based on the patterns.
 *
 * @param scope - The scope to check (e.g., `@myorg`)
 * @param stripScopes - List of scope patterns to match (supports glob patterns via picomatch)
 * @returns `true` if the scope matches any pattern
 */
function shouldStripScope(
	scope: string,
	stripScopes: string[] | undefined,
): boolean {
	if (stripScopes === undefined || stripScopes.length === 0) {
		return false;
	}

	return picomatch.isMatch(scope, stripScopes);
}

/**
 * Get the expected folder name from a package name.
 *
 * @param packageName - The package name (e.g., `@myorg/my-package`)
 * @param stripScopes - Scope patterns to strip from the package name
 * @returns The expected folder name
 */
function getExpectedFolderName(
	packageName: string,
	stripScopes: string[] | undefined,
): string {
	// Check if the package is scoped and should have scope stripped
	if (packageName.startsWith("@") && stripScopes !== undefined) {
		const slashIndex = packageName.indexOf("/");
		if (slashIndex !== -1) {
			const scope = packageName.slice(0, slashIndex);
			if (shouldStripScope(scope, stripScopes)) {
				return packageName.slice(slashIndex + 1);
			}
		}
	}

	// Return full package name for unscoped packages or scopes not in stripScopes
	return packageName;
}

/**
 * A policy that ensures package folder names match package names.
 *
 * This policy helps maintain a consistent and predictable file structure
 * in monorepos by ensuring that folder names correspond to package names.
 * This makes it easier to locate packages in the file system.
 *
 * @remarks
 *
 * The policy compares the immediate parent folder name of the package.json
 * against the package name. For scoped packages, the scope can optionally
 * be stripped based on the `stripScopes` configuration.
 *
 * For example:
 * - `packages/my-lib/package.json` with name `my-lib` ✓
 * - `packages/my-lib/package.json` with name `@myorg/my-lib` ✓ (if @myorg in stripScopes)
 * - `packages/wrong-name/package.json` with name `my-lib` ✗
 *
 * @example
 * ```typescript
 * import { makePolicy } from "repopo";
 * import { PackageFolderName } from "repopo/policies";
 *
 * const config: RepopoConfig = {
 *   policies: [
 *     makePolicy(PackageFolderName, {
 *       stripScopes: ["@myorg", "@internal"],
 *       excludePackages: ["@myorg/special-case"],
 *     }),
 *   ],
 * };
 * ```
 *
 * @alpha
 */
export const PackageFolderName = definePackagePolicy<
	PackageJson,
	PackageFolderNameConfig | undefined
>("PackageFolderName", async (json, { file, config }) => {
	// If no config provided, use defaults (check all packages)
	const effectiveConfig = config ?? {};

	const packageName = json.name;

	// Skip packages without a name
	if (packageName === undefined) {
		return true;
	}

	// Skip the root package (common in monorepos)
	if (packageName === "root") {
		return true;
	}

	// Skip explicitly excluded packages
	if (effectiveConfig.excludePackages?.includes(packageName)) {
		return true;
	}

	// Get the folder name (parent directory of package.json)
	const folderName = path.basename(path.dirname(file));

	// Get the expected folder name
	const expectedFolderName = getExpectedFolderName(
		packageName,
		effectiveConfig.stripScopes,
	);

	// Compare folder name to expected name
	if (folderName === expectedFolderName) {
		return true;
	}

	// Mismatch - build error message
	const failResult: PolicyFailure = {
		name: PackageFolderName.name,
		file,
		autoFixable: false, // Can't auto-fix folder names
		errorMessage: `Package folder "${folderName}" does not match package name "${packageName}". Expected folder name: "${expectedFolderName}"`,
	};

	return failResult;
});
