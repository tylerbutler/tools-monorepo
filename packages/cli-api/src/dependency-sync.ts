import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { exists } from "@tylerbu/fundamentals";
import semver from "semver";
import type { PackageManager } from "./package-manager.js";
import { getPackageManagerInfo } from "./package-manager.js";

/**
 * Information about a dependency including its version
 *
 * @beta
 */
export interface DependencyInfo {
	version: string;
	[key: string]: unknown;
}

/**
 * Information about a project/package including its dependencies
 *
 * @beta
 */
export interface ProjectInfo {
	name: string;
	path: string;
	dependencies?: Record<string, DependencyInfo>;
	devDependencies?: Record<string, DependencyInfo>;
	peerDependencies?: Record<string, DependencyInfo>;
	optionalDependencies?: Record<string, DependencyInfo>;
}

/**
 * Standard package.json structure
 *
 * @beta
 */
export interface PackageJson {
	name?: string;
	version?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
	[key: string]: unknown;
}

/**
 * Type of dependency group
 *
 * @beta
 */
export type DependencyType =
	| "dependencies"
	| "devDependencies"
	| "peerDependencies"
	| "optionalDependencies";

/**
 * Information about a single dependency change
 *
 * @beta
 */
export interface DependencyChange {
	dep: string;
	type: DependencyType;
	from: string;
	to: string;
}

/**
 * Result of syncing a single package.json file
 *
 * @beta
 */
export interface SyncResult {
	packagePath: string;
	changes: DependencyChange[];
}

/**
 * Options for updating version ranges
 *
 * @beta
 */
export interface UpdateVersionRangeOptions {
	/**
	 * Whether to emit warnings for complex ranges
	 * @defaultValue true
	 */
	emitWarnings?: boolean;
}

/**
 * Result of updating a version range
 *
 * @beta
 */
export interface UpdateVersionRangeResult {
	/**
	 * The updated version range
	 */
	updated: string;
	/**
	 * Whether the update was skipped (e.g., invalid semver, special protocol, complex range)
	 */
	skipped: boolean;
	/**
	 * Optional warning message about why the range wasn't updated or was preserved
	 */
	warning?: string;
}

/**
 * Options for syncing package.json files
 *
 * @beta
 */
export interface SyncPackageJsonOptions {
	/**
	 * Whether to actually write changes to disk
	 * @defaultValue false (dry-run mode)
	 */
	write?: boolean;
	/**
	 * Options for version range updates
	 */
	versionRangeOptions?: UpdateVersionRangeOptions;
}

/**
 * Options for getting installed versions
 *
 * @beta
 */
export interface GetInstalledVersionsOptions {
	/**
	 * Working directory for command execution
	 * @defaultValue process.cwd()
	 */
	cwd?: string;
}

// Internal types for package manager outputs

interface PnpmProject {
	name: string;
	path: string;
	dependencies?: Record<string, DependencyInfo>;
	devDependencies?: Record<string, DependencyInfo>;
	peerDependencies?: Record<string, DependencyInfo>;
	optionalDependencies?: Record<string, DependencyInfo>;
}

interface NpmDependency {
	version: string;
	resolved?: string;
	path?: string;
	dependencies?: Record<string, NpmDependency>;
	devDependencies?: Record<string, NpmDependency>;
	peerDependencies?: Record<string, NpmDependency>;
	optionalDependencies?: Record<string, NpmDependency>;
}

interface NpmListOutput {
	name: string;
	path?: string;
	version?: string;
	dependencies?: Record<string, NpmDependency>;
	devDependencies?: Record<string, NpmDependency>;
	peerDependencies?: Record<string, NpmDependency>;
	optionalDependencies?: Record<string, NpmDependency>;
}

/**
 * Checks if a package manager is supported for dependency sync operations
 *
 * @param pm - Package manager name
 * @returns True if supported, false otherwise
 *
 * @beta
 */
export function isSyncSupported(pm: PackageManager): boolean {
	// Currently Yarn and Bun are not fully supported for sync
	return pm === "npm" || pm === "pnpm";
}

/**
 * Determines if a version string should be skipped during sync
 *
 * @param version - Version string to check
 * @returns True if the version should be skipped
 *
 * @beta
 */
export function shouldSkipVersion(version: string): boolean {
	const SKIP_PROTOCOLS = [
		"link:",
		"file:",
		"git:",
		"git+",
		"http:",
		"https:",
		"workspace:",
	];
	return SKIP_PROTOCOLS.some((protocol) => version.startsWith(protocol));
}

/**
 * Validates if a version string is valid semver
 *
 * @param version - Version string to validate
 * @returns True if valid semver
 *
 * @beta
 */
export function isValidSemver(version: string): boolean {
	return semver.valid(version) !== null;
}

/**
 * Updates a version range based on an installed version
 *
 * @param currentRange - Current version range in package.json
 * @param installedVersion - Installed version from lockfile
 * @param options - Options for updating the range
 * @returns Result containing the updated range and any warnings
 *
 * @remarks
 * This function handles various version range formats:
 * - Caret ranges (^1.0.0) → ^{installedVersion}
 * - Tilde ranges (~1.0.0) → ~{installedVersion}
 * - Exact versions (1.0.0) → {installedVersion}
 * - Special values (*, latest) → preserved as-is
 * - Workspace protocol → preserved as-is
 * - Complex ranges (>=, <=, >, <) → preserved as-is with warning
 * - Hyphen ranges (1.0.0 - 2.0.0) → preserved as-is with warning
 *
 * @beta
 */
export function updateVersionRange(
	currentRange: string,
	installedVersion: string,
	options: UpdateVersionRangeOptions = {},
): UpdateVersionRangeResult {
	const { emitWarnings = true } = options;

	// Validate installed version is valid semver
	if (!isValidSemver(installedVersion)) {
		return {
			updated: currentRange,
			skipped: true,
			warning: emitWarnings
				? `installed version ${installedVersion} is not valid semver`
				: undefined,
		};
	}

	// Handle workspace protocol
	if (currentRange.startsWith("workspace:")) {
		return {
			updated: currentRange,
			skipped: true,
		};
	}

	// Handle npm/catalog/other protocols
	if (currentRange.includes(":")) {
		return {
			updated: currentRange,
			skipped: true,
		};
	}

	// Handle hyphen ranges (e.g., "1.0.0 - 2.0.0")
	if (currentRange.includes(" - ")) {
		return {
			updated: currentRange,
			skipped: true,
			warning: emitWarnings
				? `Hyphen range detected: "${currentRange}". Keeping as-is.`
				: undefined,
		};
	}

	// Detect the range type and update accordingly
	if (currentRange.startsWith("^")) {
		return {
			updated: `^${installedVersion}`,
			skipped: false,
		};
	}
	if (currentRange.startsWith("~")) {
		return {
			updated: `~${installedVersion}`,
			skipped: false,
		};
	}
	if (
		currentRange.startsWith(">=") ||
		currentRange.startsWith("<=") ||
		currentRange.startsWith(">") ||
		currentRange.startsWith("<")
	) {
		// Keep complex ranges as-is (too risky to auto-update)
		return {
			updated: currentRange,
			skipped: true,
			warning: emitWarnings
				? `Complex range detected: "${currentRange}". Keeping as-is.`
				: undefined,
		};
	}
	if (currentRange === "*" || currentRange === "latest") {
		return {
			updated: currentRange,
			skipped: true,
		};
	}
	// Exact version (pinned)
	return {
		updated: installedVersion,
		skipped: false,
	};
}

/**
 * Parses pnpm list output into ProjectInfo array
 *
 * @param data - Parsed JSON output from pnpm list command
 * @returns Array of project information
 *
 * @beta
 */
export function parsePnpmList(data: unknown): ProjectInfo[] {
	if (!Array.isArray(data)) {
		throw new Error("Expected pnpm list output to be an array");
	}

	const projects: ProjectInfo[] = [];

	for (const project of data as PnpmProject[]) {
		// Filter out workspace dependencies based on version format
		const filterWorkspaceDeps = (
			deps: Record<string, DependencyInfo> | undefined,
		): Record<string, DependencyInfo> => {
			if (!deps) {
				return {};
			}
			const filtered: Record<string, DependencyInfo> = {};
			for (const [name, info] of Object.entries(deps)) {
				// Skip workspace packages (version starts with "link:")
				if (!info.version.startsWith("link:")) {
					filtered[name] = info;
				}
			}
			return filtered;
		};

		projects.push({
			name: project.name,
			path: project.path,
			dependencies: filterWorkspaceDeps(project.dependencies),
			devDependencies: filterWorkspaceDeps(project.devDependencies),
			peerDependencies: filterWorkspaceDeps(project.peerDependencies),
			optionalDependencies: filterWorkspaceDeps(project.optionalDependencies),
		});
	}

	return projects;
}

/**
 * Parses npm list output into ProjectInfo array
 *
 * @param data - Parsed JSON output from npm list command
 * @param workingDir - Working directory (used as fallback for path)
 * @returns Array of project information
 *
 * @beta
 */
export function parseNpmList(
	data: unknown,
	workingDir: string = process.cwd(),
): ProjectInfo[] {
	if (typeof data !== "object" || data === null) {
		throw new Error("Expected npm list output to be an object");
	}

	const npmData = data as NpmListOutput;
	const projects: ProjectInfo[] = [];

	// Helper to check if a dependency is a workspace package
	const isWorkspaceDep = (dep: NpmDependency): boolean => {
		// Workspace packages have resolved pointing to local file paths
		// Regular packages point to .pnpm or registry URLs
		if (!dep.resolved) {
			return false;
		}
		return (
			dep.resolved.startsWith("file:") &&
			!dep.resolved.includes("node_modules/.pnpm")
		);
	};

	// Helper to convert npm deps, excluding workspace packages
	const convertNpmDeps = (
		deps: Record<string, NpmDependency> | undefined,
	): Record<string, DependencyInfo> => {
		if (!deps) {
			return {};
		}
		const result: Record<string, DependencyInfo> = {};
		for (const [name, info] of Object.entries(deps)) {
			if (typeof info === "object" && info.version && !isWorkspaceDep(info)) {
				result[name] = { version: info.version };
			}
		}
		return result;
	};

	// Root project
	projects.push({
		name: npmData.name,
		path: npmData.path || workingDir,
		dependencies: convertNpmDeps(npmData.dependencies),
		devDependencies: convertNpmDeps(npmData.devDependencies),
		peerDependencies: convertNpmDeps(npmData.peerDependencies),
		optionalDependencies: convertNpmDeps(npmData.optionalDependencies),
	});

	// Extract workspace projects from dependencies
	if (npmData.dependencies) {
		for (const [, info] of Object.entries(npmData.dependencies)) {
			if (typeof info === "object" && info.version && isWorkspaceDep(info)) {
				projects.push({
					name: "", // npm doesn't provide name in nested structure
					path: info.path || workingDir,
					dependencies: convertNpmDeps(info.dependencies),
					devDependencies: convertNpmDeps(info.devDependencies),
					peerDependencies: convertNpmDeps(info.peerDependencies),
					optionalDependencies: convertNpmDeps(info.optionalDependencies),
				});
			}
		}
	}

	return projects;
}

/**
 * Parses package manager list output based on the package manager type
 *
 * @param packageManager - Package manager that generated the output
 * @param output - Raw JSON string output from list command
 * @param workingDir - Working directory (used for npm fallback)
 * @returns Array of project information
 * @throws Error if parsing fails
 *
 * @beta
 */
export function parsePackageManagerList(
	packageManager: PackageManager,
	output: string,
	workingDir: string = process.cwd(),
): ProjectInfo[] {
	try {
		const parsed = JSON.parse(output);
		return packageManager === "pnpm"
			? parsePnpmList(parsed)
			: parseNpmList(parsed, workingDir);
	} catch (error) {
		throw new Error(
			`Failed to parse ${packageManager} list output: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Gets installed dependency versions from package manager
 *
 * @param packageManager - Package manager to use
 * @param options - Options for getting installed versions
 * @returns Promise resolving to array of project information
 * @throws Error if command execution fails
 *
 * @beta
 */
export async function getInstalledVersions(
	packageManager: PackageManager,
	options: GetInstalledVersionsOptions = {},
): Promise<ProjectInfo[]> {
	const { cwd = process.cwd() } = options;

	const pmInfo = getPackageManagerInfo(packageManager);
	// Split command into executable and arguments to avoid shell interpretation
	const commandParts = pmInfo.listCommand.split(" ");
	const executable = commandParts[0];
	if (!executable) {
		throw new Error(
			`Invalid list command for ${packageManager}: ${pmInfo.listCommand}`,
		);
	}
	const args = commandParts.slice(1);

	try {
		const output = execFileSync(executable, args, {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
			cwd,
		});

		return parsePackageManagerList(packageManager, output, cwd);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const stderr =
			typeof error === "object" &&
			error !== null &&
			"stderr" in error &&
			typeof error.stderr === "string"
				? error.stderr
				: "";

		let message = `Failed to get installed versions from ${packageManager}:\n${errorMessage}`;
		if (stderr) {
			message += `\n\nCommand stderr:\n${stderr}`;
		}

		throw new Error(message);
	}
}

/**
 * Syncs a single dependency group (dependencies, devDependencies, etc.)
 *
 * @param dependencies - Dependencies from package.json
 * @param installed - Installed dependencies from lockfile
 * @param type - Type of dependency group
 * @param options - Options for version range updates
 * @returns Array of changes made
 *
 * @beta
 */
export function syncDependencyGroup(
	dependencies: Record<string, string>,
	installed: Record<string, DependencyInfo>,
	type: DependencyType,
	options: UpdateVersionRangeOptions = {},
): DependencyChange[] {
	const changes: DependencyChange[] = [];

	for (const [dep, currentRange] of Object.entries(dependencies)) {
		const installedInfo = installed[dep];
		if (installedInfo && !shouldSkipVersion(installedInfo.version)) {
			const result = updateVersionRange(
				currentRange,
				installedInfo.version,
				options,
			);
			if (result.updated !== currentRange) {
				changes.push({
					dep,
					type,
					from: currentRange,
					to: result.updated,
				});
				dependencies[dep] = result.updated;
			}
		}
	}

	return changes;
}

/**
 * Syncs a single package.json file with installed versions
 *
 * @param packageJsonPath - Path to package.json file
 * @param installedDeps - Installed dependencies
 * @param installedDevDeps - Installed devDependencies
 * @param installedPeerDeps - Installed peerDependencies
 * @param installedOptionalDeps - Installed optionalDependencies
 * @param options - Options for syncing
 * @returns Promise resolving to sync result
 * @throws Error if file cannot be read or parsed
 *
 * @beta
 */
export async function syncPackageJson(
	packageJsonPath: string,
	installedDeps: Record<string, DependencyInfo>,
	installedDevDeps: Record<string, DependencyInfo>,
	installedPeerDeps: Record<string, DependencyInfo>,
	installedOptionalDeps: Record<string, DependencyInfo>,
	options: SyncPackageJsonOptions = {},
): Promise<SyncResult> {
	const { write = false, versionRangeOptions = {} } = options;

	let pkg: PackageJson;
	try {
		pkg = JSON.parse(await readFile(packageJsonPath, "utf-8")) as PackageJson;
	} catch (error) {
		throw new Error(
			`Failed to read or parse ${packageJsonPath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	// In dry-run mode, work on a copy to avoid mutations
	// Note: JSON parse/stringify is acceptable here as PackageJson is a plain object
	const workingPkg = write
		? pkg
		: (JSON.parse(JSON.stringify(pkg)) as PackageJson);

	const changes: DependencyChange[] = [];

	// Define dependency types to sync
	const depTypes: Array<{
		key: keyof PackageJson;
		installed: Record<string, DependencyInfo>;
		type: DependencyType;
	}> = [
		{
			key: "dependencies",
			installed: installedDeps,
			type: "dependencies",
		},
		{
			key: "devDependencies",
			installed: installedDevDeps,
			type: "devDependencies",
		},
		{
			key: "peerDependencies",
			installed: installedPeerDeps,
			type: "peerDependencies",
		},
		{
			key: "optionalDependencies",
			installed: installedOptionalDeps,
			type: "optionalDependencies",
		},
	];

	// Sync all dependency types
	for (const { key, installed, type } of depTypes) {
		const deps = workingPkg[key];
		if (deps && typeof deps === "object") {
			changes.push(
				...syncDependencyGroup(
					deps as Record<string, string>,
					installed,
					type,
					versionRangeOptions,
				),
			);
		}
	}

	// Write back if changes and write mode enabled
	if (changes.length > 0 && write) {
		await writeFile(
			packageJsonPath,
			`${JSON.stringify(workingPkg, null, "\t")}\n`,
		);
	}

	return {
		packagePath: packageJsonPath,
		changes,
	};
}

/**
 * Syncs all packages in a workspace
 *
 * @param projects - Array of project information from package manager
 * @param options - Options for syncing
 * @returns Promise resolving to array of sync results (only packages with changes)
 *
 * @beta
 */
export async function syncAllPackages(
	projects: ProjectInfo[],
	options: SyncPackageJsonOptions = {},
): Promise<SyncResult[]> {
	// Filter projects that have package.json
	const projectsWithPackageJson: ProjectInfo[] = [];
	for (const project of projects) {
		const packageJsonPath = path.join(project.path, "package.json");
		if (!(await exists(packageJsonPath))) {
			continue;
		}
		projectsWithPackageJson.push(project);
	}

	// Sync all packages
	const results = await Promise.all(
		projectsWithPackageJson.map(async (project) => {
			const packageJsonPath = path.join(project.path, "package.json");
			return syncPackageJson(
				packageJsonPath,
				project.dependencies || {},
				project.devDependencies || {},
				project.peerDependencies || {},
				project.optionalDependencies || {},
				options,
			);
		}),
	);

	// Filter out results with no changes and return
	return results.filter((r) => r.changes.length > 0);
}
