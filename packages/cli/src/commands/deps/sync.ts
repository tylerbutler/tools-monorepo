import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Flags } from "@oclif/core";
import {
	CommandWithConfig,
	detectFromLockfilePath,
	detectPackageManager,
	getAllLockfiles,
	getPackageManagerInfo,
	type PackageManager,
} from "@tylerbu/cli-api";
import chalk from "picocolors";
import semver from "semver";

// Types
interface DependencyInfo {
	version: string;
	[key: string]: unknown;
}

interface ProjectInfo {
	name: string;
	path: string;
	dependencies?: Record<string, DependencyInfo>;
	devDependencies?: Record<string, DependencyInfo>;
	peerDependencies?: Record<string, DependencyInfo>;
	optionalDependencies?: Record<string, DependencyInfo>;
}

interface PackageJson {
	name?: string;
	version?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
	[key: string]: unknown;
}

interface SyncResult {
	packagePath: string;
	changes: Array<{
		dep: string;
		type:
			| "dependencies"
			| "devDependencies"
			| "peerDependencies"
			| "optionalDependencies";
		from: string;
		to: string;
	}>;
}

// Package manager output types
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

export default class DepsSync extends CommandWithConfig<
	typeof DepsSync,
	never
> {
	protected override requiresConfig = false;
	public static override readonly description =
		"Sync package.json dependency versions to match what's installed in the lockfile. " +
		"This addresses a Dependabot bug where versioning-strategy: increase doesn't update " +
		"package.json for dependencies with caret ranges (^) that already satisfy the new version. " +
		"Supports npm, pnpm, yarn (partial), and bun (partial). " +
		"\n\nLIMITATIONS:\n" +
		"- Complex ranges (>=, <=, >, <) are preserved as-is (too risky to auto-update)\n" +
		'- Hyphen ranges (e.g., "1.0.0 - 2.0.0") are preserved as-is\n' +
		"- These limitations are logged as warnings when encountered\n" +
		"\nSee: https://github.com/dependabot/dependabot-core/issues/9020";

	public static override readonly examples = [
		{
			description: "Preview changes (dry-run mode, default)",
			command: "<%= config.bin %> <%= command.id %>",
		},
		{
			description: "Apply changes to package.json files",
			command: "<%= config.bin %> <%= command.id %> --execute",
		},
		{
			description: "Apply changes (short flag)",
			command: "<%= config.bin %> <%= command.id %> -x",
		},
		{
			description: "Work in specific directory",
			command:
				"<%= config.bin %> <%= command.id %> --cwd packages/my-package -x",
		},
		{
			description: "Use specific lockfile",
			command:
				"<%= config.bin %> <%= command.id %> --lockfile ./pnpm-lock.yaml -x",
		},
		{
			description: "Quiet mode for CI",
			command: "<%= config.bin %> <%= command.id %> -x --quiet",
		},
		{
			description: "JSON output",
			command: "<%= config.bin %> <%= command.id %> --json",
		},
	];

	public static override readonly enableJsonFlag = true;

	public static override readonly flags = {
		execute: Flags.boolean({
			char: "x",
			description: "Apply changes to package.json files (default: dry-run)",
			default: false,
		}),
		lockfile: Flags.file({
			char: "l",
			description: `Path to lockfile (auto-detects ${getAllLockfiles().join(", ")} if not provided)`,
			required: false,
			exists: true,
			exclusive: ["package-manager"],
		}),
		cwd: Flags.directory({
			description: "Working directory (default: current directory)",
			required: false,
			exists: true,
		}),
		"package-manager": Flags.custom<PackageManager>({
			description: "Force specific package manager",
			options: ["npm", "pnpm", "yarn", "bun"] as const,
			required: false,
			exclusive: ["lockfile"],
		})(),
		...CommandWithConfig.flags,
	};

	private isDryRun = true;
	private workingDir = "";

	public override async run(): Promise<void> {
		// Set working directory
		this.workingDir = this.flags.cwd
			? path.resolve(this.flags.cwd)
			: process.cwd();

		// Validate that the working directory exists and is safe
		if (!fs.existsSync(this.workingDir)) {
			this.error(`Working directory does not exist: ${this.workingDir}`);
		}

		// Verify it's actually a directory
		const stats = fs.statSync(this.workingDir);
		if (!stats.isDirectory()) {
			this.error(`Path is not a directory: ${this.workingDir}`);
		}

		this.isDryRun = !this.flags.execute;

		if (!this.jsonEnabled()) {
			this.log(chalk.blue("🔄 Syncing package.json versions to lockfile...\n"));
		}

		try {
			const packageManager = this.detectPackageManagerFromFlags();
			this.verbose(`Detected package manager: ${packageManager}`);

			const projects = await this.getInstalledVersions(packageManager);
			this.verbose(`Found ${projects.length} project(s)\n`);

			// Sync all packages
			const results = this.syncAllPackagesSync(projects);
			if (this.jsonEnabled()) {
				this.log(JSON.stringify(results, null, 2));
			} else {
				this.reportResults(results);
			}
		} catch (error) {
			if (error instanceof Error) {
				this.error(error.message);
			}
			throw error;
		}
	}

	private detectPackageManagerFromFlags(): PackageManager {
		// Check for explicit flag
		if (this.flags["package-manager"]) {
			return this.flags["package-manager"] as PackageManager;
		}

		// Check for explicit lockfile path
		if (this.flags.lockfile) {
			const lockfilePath = path.resolve(this.flags.lockfile);

			const detected = detectFromLockfilePath(lockfilePath);
			if (!detected) {
				this.error(
					`Unrecognized lockfile: ${path.basename(lockfilePath)}\nSupported: ${getAllLockfiles().join(", ")}`,
				);
			}

			// Check if sync is supported
			if (!isSyncSupported(detected)) {
				this.error(
					`❌ ${detected} is not yet fully supported for sync operations.\nCurrently supported: npm, pnpm\nContributions welcome! See: https://github.com/tylerbutler/tools-monorepo`,
				);
			}

			return detected;
		}

		// Auto-detect from current directory
		const detected = detectPackageManager(this.workingDir);
		if (!detected) {
			this.error(
				`No lockfile found in ${this.workingDir}\nSupported: ${getAllLockfiles().join(", ")}`,
			);
		}

		// Check if sync is supported
		if (!isSyncSupported(detected)) {
			this.error(
				`❌ ${detected} is not yet fully supported for sync operations.\nCurrently supported: npm, pnpm\nContributions welcome! See: https://github.com/tylerbutler/tools-monorepo`,
			);
		}

		return detected;
	}

	private async getInstalledVersions(
		packageManager: PackageManager,
	): Promise<ProjectInfo[]> {
		this.verbose(`Getting installed versions using ${packageManager}...`);

		const pmInfo = getPackageManagerInfo(packageManager);
		// Split command into executable and arguments to avoid shell interpretation
		const commandParts = pmInfo.listCommand.split(" ");
		const executable = commandParts[0];
		const args = commandParts.slice(1);

		try {
			const output = execFileSync(executable, args, {
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "pipe"],
				cwd: this.workingDir,
			});

			return this.parseListOutput(packageManager, output);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
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

			this.error(message);
		}
	}

	private parseListOutput(
		packageManager: PackageManager,
		output: string,
	): ProjectInfo[] {
		try {
			const parsed = JSON.parse(output);
			return packageManager === "pnpm"
				? this.parsePnpmList(parsed)
				: this.parseNpmList(parsed);
		} catch (error) {
			this.error(
				`Failed to parse ${packageManager} list output:\n${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private parsePnpmList(data: PnpmProject[]): ProjectInfo[] {
		const projects: ProjectInfo[] = [];

		for (const project of data) {
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

	private parseNpmList(data: NpmListOutput): ProjectInfo[] {
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
			name: data.name,
			path: data.path || this.workingDir,
			dependencies: convertNpmDeps(data.dependencies),
			devDependencies: convertNpmDeps(data.devDependencies),
			peerDependencies: convertNpmDeps(data.peerDependencies),
			optionalDependencies: convertNpmDeps(data.optionalDependencies),
		});

		// Extract workspace projects from dependencies
		if (data.dependencies) {
			for (const [, info] of Object.entries(data.dependencies)) {
				if (typeof info === "object" && info.version && isWorkspaceDep(info)) {
					projects.push({
						name: "", // npm doesn't provide name in nested structure
						path: info.path || this.workingDir,
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

	private syncAllPackagesSync(projects: ProjectInfo[]): SyncResult[] {
		// Filter projects that have package.json and sync them all
		const results = projects
			.filter((project) => {
				const packageJsonPath = path.join(project.path, "package.json");
				if (!fs.existsSync(packageJsonPath)) {
					this.verbose(`⚠️  Skipping ${project.name}: package.json not found`);
					return false;
				}
				return true;
			})
			.map((project) => {
				const packageJsonPath = path.join(project.path, "package.json");
				return this.syncPackageJsonSync(
					packageJsonPath,
					project.dependencies || {},
					project.devDependencies || {},
					project.peerDependencies || {},
					project.optionalDependencies || {},
				);
			});

		// Filter out results with no changes and return
		return results.filter((r) => r.changes.length > 0);
	}

	private shouldSkipVersion(version: string): boolean {
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

	private isValidSemver(version: string): boolean {
		return semver.valid(version) !== null;
	}

	private syncDependencyGroup(
		dependencies: Record<string, string>,
		installed: Record<string, DependencyInfo>,
		type:
			| "dependencies"
			| "devDependencies"
			| "peerDependencies"
			| "optionalDependencies",
	): Array<{
		dep: string;
		type:
			| "dependencies"
			| "devDependencies"
			| "peerDependencies"
			| "optionalDependencies";
		from: string;
		to: string;
	}> {
		const changes: Array<{
			dep: string;
			type:
				| "dependencies"
				| "devDependencies"
				| "peerDependencies"
				| "optionalDependencies";
			from: string;
			to: string;
		}> = [];

		for (const [dep, currentRange] of Object.entries(dependencies)) {
			const installedInfo = installed[dep];
			if (installedInfo && !this.shouldSkipVersion(installedInfo.version)) {
				const newRange = this.updateVersionRange(
					currentRange,
					installedInfo.version,
					dep,
				);
				if (newRange !== currentRange) {
					changes.push({
						dep,
						type,
						from: currentRange,
						to: newRange,
					});
					dependencies[dep] = newRange;
				}
			}
		}

		return changes;
	}

	private syncPackageJsonSync(
		packageJsonPath: string,
		installedDeps: Record<string, DependencyInfo>,
		installedDevDeps: Record<string, DependencyInfo>,
		installedPeerDeps: Record<string, DependencyInfo>,
		installedOptionalDeps: Record<string, DependencyInfo>,
	): SyncResult {
		let pkg: PackageJson;
		try {
			pkg = JSON.parse(
				fs.readFileSync(packageJsonPath, "utf-8"),
			) as PackageJson;
		} catch (error) {
			this.error(
				`Failed to read or parse ${packageJsonPath}:\n${error instanceof Error ? error.message : String(error)}`,
			);
		}

		// In dry-run mode, work on a copy to avoid mutations
		// Note: JSON parse/stringify is acceptable here as PackageJson is a plain object
		const workingPkg = this.isDryRun
			? (JSON.parse(JSON.stringify(pkg)) as PackageJson)
			: pkg;

		const changes: SyncResult["changes"] = [];

		// Define dependency types to sync
		const depTypes: Array<{
			key: keyof PackageJson;
			installed: Record<string, DependencyInfo>;
			type:
				| "dependencies"
				| "devDependencies"
				| "peerDependencies"
				| "optionalDependencies";
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
					...this.syncDependencyGroup(
						deps as Record<string, string>,
						installed,
						type,
					),
				);
			}
		}

		// Write back if changes and not dry run
		if (changes.length > 0 && !this.isDryRun) {
			fs.writeFileSync(
				packageJsonPath,
				`${JSON.stringify(workingPkg, null, "\t")}\n`,
			);
		}

		return {
			packagePath: packageJsonPath,
			changes,
		};
	}

	private updateVersionRange(
		currentRange: string,
		installedVersion: string,
		depName: string,
	): string {
		// Validate installed version is valid semver
		if (!this.isValidSemver(installedVersion)) {
			this.verbose(
				`⚠️  Skipping ${depName}: installed version ${installedVersion} is not valid semver`,
			);
			return currentRange;
		}

		// Handle workspace protocol
		if (currentRange.startsWith("workspace:")) {
			return currentRange;
		}

		// Handle npm/catalog/other protocols
		if (currentRange.includes(":")) {
			return currentRange;
		}

		// Handle hyphen ranges (e.g., "1.0.0 - 2.0.0")
		if (currentRange.includes(" - ")) {
			this.warning(
				`⚠️  Hyphen range detected for ${depName}: "${currentRange}". Keeping as-is. See README for limitations.`,
			);
			return currentRange;
		}

		// Detect the range type and update accordingly
		if (currentRange.startsWith("^")) {
			return `^${installedVersion}`;
		}
		if (currentRange.startsWith("~")) {
			return `~${installedVersion}`;
		}
		if (
			currentRange.startsWith(">=") ||
			currentRange.startsWith("<=") ||
			currentRange.startsWith(">") ||
			currentRange.startsWith("<")
		) {
			// Keep complex ranges as-is (too risky to auto-update)
			this.warning(
				`⚠️  Complex range detected for ${depName}: "${currentRange}". Keeping as-is. See README for limitations.`,
			);
			return currentRange;
		}
		if (currentRange === "*" || currentRange === "latest") {
			return currentRange;
		}
		// Exact version (pinned)
		return installedVersion;
	}

	private reportResults(results: SyncResult[]): void {
		if (results.length === 0) {
			this.log(
				chalk.green(
					"✅ All package.json files are already in sync with lockfile",
				),
			);
			return;
		}

		this.reportUpdatedPackages(results);
		this.reportSummary(results);
	}

	private reportUpdatedPackages(results: SyncResult[]): void {
		const prefix = this.isDryRun
			? chalk.cyan("🔍 DRY RUN:")
			: chalk.green("✅");
		this.log(`${prefix} Updated ${results.length} package.json file(s):\n`);

		for (const result of results) {
			const relativePath = path.relative(this.workingDir, result.packagePath);
			this.log(chalk.blue(`📦 ${relativePath}`));
			this.reportChanges(result.changes);
			this.log();
		}
	}

	private reportChanges(changes: SyncResult["changes"]): void {
		for (const change of changes) {
			const typePrefix = this.getTypePrefix(change.type);
			this.log(
				`   ${typePrefix} ${change.dep}: ${chalk.red(change.from)} ${chalk.gray("→")} ${chalk.green(change.to)}`,
			);
		}
	}

	private getTypePrefix(type: SyncResult["changes"][number]["type"]): string {
		switch (type) {
			case "devDependencies":
				return chalk.gray("dev");
			case "peerDependencies":
				return chalk.yellow("peer");
			case "optionalDependencies":
				return chalk.cyan("opt");
			default:
				return "   ";
		}
	}

	private reportSummary(results: SyncResult[]): void {
		if (this.isDryRun) {
			this.log(chalk.yellow("💡 Run with --execute to apply changes"));
		} else {
			const totalChanges = results.reduce(
				(sum, r) => sum + r.changes.length,
				0,
			);
			this.log(
				chalk.green(
					`✅ Synced ${totalChanges} dependencies across ${results.length} package(s)`,
				),
			);
		}
	}
}

/**
 * Checks if a package manager is supported for sync operations
 *
 * @param pm - Package manager name
 * @returns True if supported, false otherwise
 */
export function isSyncSupported(pm: PackageManager): boolean {
	// Currently Yarn and Bun are not fully supported for sync
	return pm === "npm" || pm === "pnpm";
}
