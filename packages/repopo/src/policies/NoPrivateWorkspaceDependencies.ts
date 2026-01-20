import { readFileSync } from "node:fs";
// Use default import + destructure for CJS/ESM interop
// (resolve-workspace-root is a bundled CJS module)
import resolveWorkspaceRoot from "resolve-workspace-root";
const { getWorkspaceGlobs } = resolveWorkspaceRoot;
import { globSync } from "tinyglobby";
import type { PackageJson } from "type-fest";
import type { PolicyFailure } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * Configuration for the NoPrivateWorkspaceDependencies policy.
 */
export interface NoPrivateWorkspaceDependenciesSettings {
	/**
	 * Whether to check devDependencies in addition to dependencies.
	 * @default false
	 */
	checkDevDependencies?: boolean;
}

/**
 * Cache for workspace package lookups to avoid repeated filesystem operations.
 */
const workspacePackageCache = new Map<
	string,
	Map<string, PackageJson | undefined>
>();

/**
 * Builds a map of package name to package.json for all packages in the workspace.
 * Uses the workspace configuration (pnpm-workspace.yaml or package.json workspaces) to find packages.
 */
function buildWorkspacePackageMap(
	root: string,
): Map<string, PackageJson | undefined> {
	// Check cache first
	const cached = workspacePackageCache.get(root);
	if (cached !== undefined) {
		return cached;
	}

	const packageMap = new Map<string, PackageJson | undefined>();

	// Get workspace globs from pnpm-workspace.yaml or package.json
	const workspaceGlobs = getWorkspaceGlobs(root);
	if (workspaceGlobs === null) {
		// Not a workspace - return empty map
		workspacePackageCache.set(root, packageMap);
		return packageMap;
	}

	// Find all package.json files matching the workspace globs
	const packageGlobs = workspaceGlobs.map((g) => `${g}/package.json`);
	const packageJsonPaths = globSync(packageGlobs, {
		cwd: root,
		ignore: ["**/node_modules/**"],
		onlyFiles: true,
		absolute: true,
	});

	// Load each package.json and map by name
	for (const pkgPath of packageJsonPaths) {
		try {
			const content = readFileSync(pkgPath, "utf-8");
			const pkg = JSON.parse(content) as PackageJson;
			if (pkg.name) {
				packageMap.set(pkg.name, pkg);
			}
		} catch {
			// Ignore parse errors
		}
	}

	workspacePackageCache.set(root, packageMap);
	return packageMap;
}

/**
 * Looks up a workspace package by name using the workspace configuration.
 */
function findWorkspacePackage(
	depName: string,
	root: string,
): PackageJson | undefined {
	const packageMap = buildWorkspacePackageMap(root);
	return packageMap.get(depName);
}

/**
 * Checks if a dependency version uses the workspace protocol.
 */
function isWorkspaceDependency(version: string | undefined): boolean {
	return version?.startsWith("workspace:") ?? false;
}

/**
 * Policy that prevents publishable packages from depending on private workspace packages.
 *
 * A package is considered "publishable" if it does not have `"private": true` in its package.json.
 * Such packages cannot have `workspace:` dependencies on packages that are marked as private,
 * because those dependencies won't be resolvable when the package is published to npm.
 *
 * This policy uses the workspace configuration (pnpm-workspace.yaml or package.json workspaces field)
 * to locate workspace packages, rather than hardcoding directory conventions.
 *
 * @example
 * ```typescript
 * // In repopo.config.ts
 * import { NoPrivateWorkspaceDependencies } from "repopo/policies";
 *
 * makePolicy(NoPrivateWorkspaceDependencies, {
 *   checkDevDependencies: false, // Only check production dependencies (default)
 * });
 *
 * // Or check both dependencies and devDependencies
 * makePolicy(NoPrivateWorkspaceDependencies, {
 *   checkDevDependencies: true,
 * });
 * ```
 */
export const NoPrivateWorkspaceDependencies = definePackagePolicy<
	PackageJson,
	NoPrivateWorkspaceDependenciesSettings | undefined
>("NoPrivateWorkspaceDependencies", async (json, { file, root, config }) => {
	// Private packages can depend on anything - they won't be published
	if (json.private === true) {
		return true;
	}

	const checkDevDeps = config?.checkDevDependencies ?? false;

	// Collect dependencies to check
	const depsToCheck: Record<string, string | undefined> = {
		...(json.dependencies ?? {}),
	};

	if (checkDevDeps) {
		Object.assign(depsToCheck, json.devDependencies ?? {});
	}

	const privateWorkspaceDeps: string[] = [];
	const unresolvableDeps: string[] = [];

	for (const [depName, version] of Object.entries(depsToCheck)) {
		if (!isWorkspaceDependency(version)) {
			continue;
		}

		const depPackageJson = findWorkspacePackage(depName, root);

		if (depPackageJson === undefined) {
			// Could not find the package - might be a configuration issue
			// We'll warn but not fail, as this could be a valid setup we don't understand
			unresolvableDeps.push(depName);
			continue;
		}

		if (depPackageJson.private === true) {
			privateWorkspaceDeps.push(depName);
		}
	}

	const errorMessages: string[] = [];

	if (privateWorkspaceDeps.length > 0) {
		errorMessages.push(
			`Publishable package has workspace dependencies on private packages that won't be available on npm:\n\t${privateWorkspaceDeps.join("\n\t")}`,
		);
	}

	if (unresolvableDeps.length > 0) {
		errorMessages.push(
			`Could not resolve workspace dependencies (verify they exist):\n\t${unresolvableDeps.join("\n\t")}`,
		);
	}

	if (errorMessages.length > 0) {
		const failResult: PolicyFailure = {
			name: NoPrivateWorkspaceDependencies.name,
			file,
			autoFixable: false,
			errorMessages,
		};
		return failResult;
	}

	return true;
});
