import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Flags } from "@oclif/core";
import { CommandWithConfig } from "@tylerbu/cli-api";
import chalk from "picocolors";
import semver from "semver";
import {
	type PackageManager,
	detectFromLockfilePath,
	detectPackageManager,
	getAllLockfiles,
	getPackageManagerInfo,
	isSyncSupported,
} from "../../lib/package-manager.js";

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
}

interface PackageJson {
	name?: string;
	version?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	[key: string]: unknown;
}

interface SyncResult {
	packagePath: string;
	changes: Array<{
		dep: string;
		type: "dependencies" | "devDependencies";
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
}

interface NpmDependency {
	version: string;
	path?: string;
	dependencies?: Record<string, NpmDependency>;
	devDependencies?: Record<string, NpmDependency>;
}

interface NpmListOutput {
	name: string;
	path?: string;
	version?: string;
	dependencies?: Record<string, NpmDependency>;
	devDependencies?: Record<string, NpmDependency>;
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
		"See: https://github.com/dependabot/dependabot-core/issues/9020";

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

	public static override readonly flags = {
		execute: Flags.boolean({
			char: "x",
			description: "Apply changes to package.json files (default: dry-run)",
			default: false,
		}),
		quiet: Flags.boolean({
			description: "Minimal output (only show changes and errors)",
			default: false,
		}),
		json: Flags.boolean({
			description: "Output results in JSON format",
			default: false,
		}),
		lockfile: Flags.string({
			char: "l",
			description: `Path to lockfile (auto-detects ${getAllLockfiles().join(", ")} if not provided)`,
			required: false,
		}),
		cwd: Flags.string({
			description: "Working directory (default: current directory)",
			required: false,
		}),
		"package-manager": Flags.string({
			description: "Force specific package manager",
			options: ["npm", "pnpm", "yarn", "bun"],
			required: false,
		}),
		...CommandWithConfig.flags,
	};

	private isDryRun = true;
	private isVerboseMode = false;
	private workingDir = "";

	public override async run(): Promise<void> {
		// Set working directory
		this.workingDir = this.flags.cwd
			? path.resolve(this.flags.cwd)
			: process.cwd();

		// Change to working directory
		const originalCwd = process.cwd();
		try {
			process.chdir(this.workingDir);

			this.isDryRun = !this.flags.execute;
			// Use verbose flag from base class, or auto-enable in dry-run mode
			this.isVerboseMode =
				this.isDryRun && !this.flags.quiet && !this.flags.json;

			if (!this.flags.json) {
				this.log(
					chalk.blue("🔄 Syncing package.json versions to lockfile...\n"),
				);
			}

			const packageManager = this.detectPackageManagerFromFlags();
			this.verboseLog(`Detected package manager: ${packageManager}`);

			const projects = this.getInstalledVersions(packageManager);
			this.verboseLog(`Found ${projects.length} project(s)\n`);

			const results: SyncResult[] = [];

			for (const project of projects) {
				const packageJsonPath = path.join(project.path, "package.json");

				if (!fs.existsSync(packageJsonPath)) {
					this.verboseLog(
						`⚠️  Skipping ${project.name}: package.json not found`,
					);
					continue;
				}

				const result = this.syncPackageJson(
					packageJsonPath,
					project.dependencies || {},
					project.devDependencies || {},
				);

				if (result.changes.length > 0) {
					results.push(result);
				}
			}

			// Output results
			if (this.flags.json) {
				this.log(JSON.stringify(results, null, 2));
			} else {
				this.reportResults(results);
			}
		} finally {
			process.chdir(originalCwd);
		}
	}

	private verboseLog(message: string): void {
		if (this.isVerboseMode) {
			this.log(message);
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
			if (!fs.existsSync(lockfilePath)) {
				this.error(`Lockfile not found: ${lockfilePath}`);
			}

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

	private getInstalledVersions(packageManager: PackageManager): ProjectInfo[] {
		this.verboseLog(`Getting installed versions using ${packageManager}...`);

		const pmInfo = getPackageManagerInfo(packageManager);
		const command = pmInfo.listCommand;

		try {
			const output = execSync(command, {
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "inherit"],
			});

			return this.parseListOutput(packageManager, output);
		} catch (error) {
			this.error(
				`Failed to get installed versions from ${packageManager}:\n${error instanceof Error ? error.message : String(error)}`,
			);
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
		return data.map((project) => ({
			name: project.name,
			path: project.path,
			dependencies: project.dependencies || {},
			devDependencies: project.devDependencies || {},
		}));
	}

	private parseNpmList(data: NpmListOutput): ProjectInfo[] {
		const projects: ProjectInfo[] = [];

		const extractProject = (
			pkg: NpmListOutput | NpmDependency,
			pkgPath: string,
		) => {
			projects.push({
				name: "name" in pkg ? pkg.name : "",
				path: pkgPath,
				dependencies: pkg.dependencies
					? this.convertNpmDeps(pkg.dependencies)
					: {},
				devDependencies: pkg.devDependencies
					? this.convertNpmDeps(pkg.devDependencies)
					: {},
			});
		};

		// Root project
		extractProject(data, data.path || this.workingDir);

		// Workspace projects
		if (data.dependencies) {
			for (const [name, info] of Object.entries(data.dependencies)) {
				if (typeof info === "object" && info.version) {
					extractProject(
						info,
						info.path || path.join(this.workingDir, "node_modules", name),
					);
				}
			}
		}

		return projects;
	}

	private convertNpmDeps(
		deps: Record<string, NpmDependency>,
	): Record<string, DependencyInfo> {
		const result: Record<string, DependencyInfo> = {};
		for (const [name, info] of Object.entries(deps)) {
			if (typeof info === "object" && info.version) {
				result[name] = { version: info.version };
			}
		}
		return result;
	}

	private shouldSkipVersion(version: string): boolean {
		const SKIP_PROTOCOLS = [
			"link:",
			"file:",
			"git:",
			"git+",
			"http:",
			"https:",
		];
		return SKIP_PROTOCOLS.some((protocol) => version.startsWith(protocol));
	}

	private isValidSemver(version: string): boolean {
		return semver.valid(version) !== null;
	}

	private syncPackageJson(
		packageJsonPath: string,
		installedDeps: Record<string, DependencyInfo>,
		installedDevDeps: Record<string, DependencyInfo>,
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

		const changes: SyncResult["changes"] = [];

		// Sync dependencies
		if (pkg.dependencies) {
			for (const [dep, currentRange] of Object.entries(pkg.dependencies)) {
				const installed = installedDeps[dep];
				if (installed && !this.shouldSkipVersion(installed.version)) {
					const newRange = this.updateVersionRange(
						currentRange,
						installed.version,
					);
					if (newRange !== currentRange) {
						changes.push({
							dep,
							type: "dependencies",
							from: currentRange,
							to: newRange,
						});
						pkg.dependencies[dep] = newRange;
					}
				}
			}
		}

		// Sync devDependencies
		if (pkg.devDependencies) {
			for (const [dep, currentRange] of Object.entries(pkg.devDependencies)) {
				const installed = installedDevDeps[dep];
				if (installed && !this.shouldSkipVersion(installed.version)) {
					const newRange = this.updateVersionRange(
						currentRange,
						installed.version,
					);
					if (newRange !== currentRange) {
						changes.push({
							dep,
							type: "devDependencies",
							from: currentRange,
							to: newRange,
						});
						pkg.devDependencies[dep] = newRange;
					}
				}
			}
		}

		// Write back if changes and not dry run
		if (changes.length > 0 && !this.isDryRun) {
			fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, "\t")}\n`);
		}

		return {
			packagePath: packageJsonPath,
			changes,
		};
	}

	private updateVersionRange(
		currentRange: string,
		installedVersion: string,
	): string {
		// Validate installed version is valid semver
		if (!this.isValidSemver(installedVersion)) {
			// Skip non-semver versions (e.g., git URLs, special tags)
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

		const prefix = this.isDryRun
			? chalk.cyan("🔍 DRY RUN:")
			: chalk.green("✅");
		this.log(`${prefix} Updated ${results.length} package.json file(s):\n`);

		for (const result of results) {
			const relativePath = path.relative(this.workingDir, result.packagePath);
			this.log(chalk.blue(`📦 ${relativePath}`));

			for (const change of result.changes) {
				const typePrefix =
					change.type === "devDependencies" ? chalk.gray("dev") : "   ";
				this.log(
					`   ${typePrefix} ${change.dep}: ${chalk.red(change.from)} ${chalk.gray("→")} ${chalk.green(change.to)}`,
				);
			}
			this.log();
		}

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
