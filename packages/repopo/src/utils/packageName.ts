/**
 * Utility functions for working with npm package names.
 *
 * @packageDocumentation
 */

/**
 * Result of parsing a package name into its components.
 *
 * @alpha
 */
export interface ParsedPackageName {
	/**
	 * The full original package name.
	 */
	name: string;

	/**
	 * The scope portion of the name (e.g., `@myorg`), or `undefined` if unscoped.
	 */
	scope: string | undefined;

	/**
	 * The name portion without the scope (e.g., `my-package`).
	 * For unscoped packages, this is the same as `name`.
	 */
	unscopedName: string;
}

/**
 * Parse a package name into its scope and unscoped name components.
 *
 * @param packageName - The package name to parse (e.g., `@myorg/my-package` or `my-package`)
 * @returns An object containing the parsed components
 *
 * @example
 * ```typescript
 * parsePackageName("@myorg/my-package")
 * // Returns: { name: "@myorg/my-package", scope: "@myorg", unscopedName: "my-package" }
 *
 * parsePackageName("my-package")
 * // Returns: { name: "my-package", scope: undefined, unscopedName: "my-package" }
 * ```
 *
 * @alpha
 */
export function parsePackageName(packageName: string): ParsedPackageName {
	if (!packageName.startsWith("@")) {
		return {
			name: packageName,
			scope: undefined,
			unscopedName: packageName,
		};
	}

	const slashIndex = packageName.indexOf("/");
	if (slashIndex === -1) {
		// Malformed scoped name without a slash - treat as unscoped
		return {
			name: packageName,
			scope: undefined,
			unscopedName: packageName,
		};
	}

	return {
		name: packageName,
		scope: packageName.slice(0, slashIndex),
		unscopedName: packageName.slice(slashIndex + 1),
	};
}

/**
 * Extract just the scope from a package name.
 *
 * @param packageName - The package name (e.g., `@myorg/foo` or `unscoped-pkg`)
 * @returns The scope (e.g., `@myorg`) or `undefined` if unscoped
 *
 * @alpha
 */
export function getPackageScope(packageName: string): string | undefined {
	return parsePackageName(packageName).scope;
}

/**
 * Extract the unscoped portion of a package name.
 *
 * @param packageName - The package name (e.g., `@myorg/my-package` or `my-package`)
 * @returns The unscoped name (e.g., `my-package`)
 *
 * @alpha
 */
export function getUnscopedName(packageName: string): string {
	return parsePackageName(packageName).unscopedName;
}

/**
 * Check if a package name is scoped.
 *
 * @param packageName - The package name to check
 * @returns `true` if the package is scoped (starts with `@` and contains `/`)
 *
 * @alpha
 */
export function isScoped(packageName: string): boolean {
	return parsePackageName(packageName).scope !== undefined;
}
