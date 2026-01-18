import type { PackageJson } from "type-fest";
import type { PolicyFailure } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";
import { getPackageScope, isScoped } from "../utils/packageName.js";

/**
 * Configuration for the PackageAllowedScopes policy.
 *
 * This policy ensures packages in a monorepo use only approved scopes or package names.
 * This prevents accidental introduction of new scopes and ensures naming consistency.
 *
 * @example
 * ```typescript
 * const config: PackageAllowedScopesConfig = {
 *   // Only packages in these scopes are allowed
 *   allowedScopes: ["@myorg", "@internal", "@experimental"],
 *   // These specific unscoped packages are also allowed
 *   unscopedPackages: ["my-legacy-tool", "special-package"],
 * };
 * ```
 *
 * @alpha
 */
export interface PackageAllowedScopesConfig {
	/**
	 * A list of npm scopes that are allowed for packages in this repository.
	 *
	 * Scopes should start with `@` (e.g., `@myorg`). A package like `@myorg/foo`
	 * would match the scope `@myorg`.
	 *
	 * @remarks
	 *
	 * If a package's scope is not in this list and the package is not in
	 * `unscopedPackages`, the policy will fail.
	 *
	 * @example
	 * ```typescript
	 * allowedScopes: ["@myorg", "@myorg-tools", "@myorg-internal"]
	 * ```
	 */
	allowedScopes?: string[];

	/**
	 * A list of unscoped package names that are explicitly allowed.
	 *
	 * Use this for legacy packages or special cases where an unscoped name is needed.
	 *
	 * @remarks
	 *
	 * Unscoped packages not in this list will cause the policy to fail.
	 *
	 * @example
	 * ```typescript
	 * unscopedPackages: ["my-legacy-tool", "special-package"]
	 * ```
	 */
	unscopedPackages?: string[];
}

/**
 * Check if a package's scope is in the allowed list.
 *
 * @param packageName - The package name to check
 * @param allowedScopes - List of allowed scopes
 * @returns `true` if the package's scope is allowed
 */
function isScopeAllowed(
	packageName: string,
	allowedScopes: string[] | undefined,
): boolean {
	if (allowedScopes === undefined || allowedScopes.length === 0) {
		return false;
	}

	const scope = getPackageScope(packageName);
	if (scope === undefined) {
		// Package is unscoped, so scope check doesn't apply
		return false;
	}

	return allowedScopes.includes(scope);
}

/**
 * Check if an unscoped package name is in the allowed list.
 *
 * @param packageName - The package name to check
 * @param unscopedPackages - List of allowed unscoped package names
 * @returns `true` if the unscoped package is allowed
 */
function isUnscopedPackageAllowed(
	packageName: string,
	unscopedPackages: string[] | undefined,
): boolean {
	if (unscopedPackages === undefined || unscopedPackages.length === 0) {
		return false;
	}

	// Only applies to unscoped packages
	if (isScoped(packageName)) {
		return false;
	}

	return unscopedPackages.includes(packageName);
}

/**
 * A policy that ensures packages use only allowed scopes and package names.
 *
 * This policy prevents accidental introduction of new npm scopes or unscoped packages
 * in a monorepo. It helps maintain naming consistency and prevents typos or mistakes
 * when creating new packages.
 *
 * @remarks
 *
 * The policy checks packages in the following order:
 *
 * 1. If the package is scoped (starts with `@`), check if its scope is in `allowedScopes`
 * 2. If the package is unscoped, check if it's in `unscopedPackages`
 * 3. If neither check passes, the policy fails
 *
 * The "root" package (common in monorepos) is automatically skipped.
 *
 * @example
 * ```typescript
 * import { makePolicy } from "repopo";
 * import { PackageAllowedScopes } from "repopo/policies";
 *
 * const config: RepopoConfig = {
 *   policies: [
 *     makePolicy(PackageAllowedScopes, {
 *       allowedScopes: ["@myorg", "@internal"],
 *       unscopedPackages: ["legacy-package"],
 *     }),
 *   ],
 * };
 * ```
 *
 * @alpha
 */
export const PackageAllowedScopes = definePackagePolicy<
	PackageJson,
	PackageAllowedScopesConfig | undefined
>("PackageAllowedScopes", async (json, { file, config }) => {
	// If no config provided, skip validation
	if (config === undefined) {
		return true;
	}

	const packageName = json.name;

	// Skip packages without a name
	if (packageName === undefined) {
		return true;
	}

	// Skip the root package (common in monorepos)
	if (packageName === "root") {
		return true;
	}

	// Check if the package uses an allowed scope
	if (isScopeAllowed(packageName, config.allowedScopes)) {
		return true;
	}

	// Check if the package is an allowed unscoped package
	if (isUnscopedPackageAllowed(packageName, config.unscopedPackages)) {
		return true;
	}

	// Package doesn't match any allowed pattern - build error message
	const scope = getPackageScope(packageName);
	let errorMessage: string;
	if (scope !== undefined) {
		// Package has an unexpected scope
		errorMessage = `Package "${packageName}" uses scope "${scope}" which is not in the allowed scopes list. Allowed scopes: ${config.allowedScopes?.join(", ") ?? "(none)"}`;
	} else {
		// Package is unscoped but not in the allowed list
		errorMessage = `Package "${packageName}" is an unscoped package that is not in the allowed unscoped packages list. Allowed unscoped packages: ${config.unscopedPackages?.join(", ") ?? "(none)"}`;
	}

	const failResult: PolicyFailure = {
		name: PackageAllowedScopes.name,
		file,
		autoFixable: false, // Can't auto-fix package names
		errorMessages: [errorMessage],
	};
	return failResult;
});
