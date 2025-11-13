import { stat } from "node:fs/promises";
import path from "node:path";
import { Flags } from "@oclif/core";
import {
	CommandWithConfig,
	type DependencyChange,
	detectFromLockfilePath,
	detectPackageManager,
	getAllLockfiles,
	getInstalledVersions,
	isSyncSupported,
	type PackageManager,
	type SyncResult,
	syncAllPackages,
} from "@tylerbu/cli-api";
import { exists } from "@tylerbu/fundamentals";
import { all, call, run } from "effection";
import chalk from "picocolors";

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
		if (!(await exists(this.workingDir))) {
			this.error(`Working directory does not exist: ${this.workingDir}`);
		}

		// Verify it's actually a directory
		const stats = await stat(this.workingDir);
		if (!stats.isDirectory()) {
			this.error(`Path is not a directory: ${this.workingDir}`);
		}

		this.isDryRun = !this.flags.execute;

		if (!this.jsonEnabled()) {
			this.log(chalk.blue("🔄 Syncing package.json versions to lockfile...\n"));
		}

		try {
			const packageManager = await this.detectPackageManagerFromFlags();
			this.verbose(`Detected package manager: ${packageManager}`);

			const projects = await getInstalledVersions(packageManager, {
				cwd: this.workingDir,
			});
			this.verbose(`Found ${projects.length} project(s)\n`);

			// Sync all packages
			const syncResult = await syncAllPackages(projects, {
				write: !this.isDryRun,
				versionRangeOptions: {
					emitWarnings: true,
				},
			});

			if (this.jsonEnabled()) {
				this.log(JSON.stringify(syncResult, null, 2));
			} else {
				this.reportSkippedProjects(syncResult.skippedProjects);
				this.reportWarnings(syncResult.results);

				// Only report changes if there are any
				const resultsWithChanges = syncResult.results.filter(
					(r) => r.changes.length > 0,
				);
				if (resultsWithChanges.length > 0) {
					this.reportResults(resultsWithChanges);
				} else if (syncResult.results.length === 0) {
					// Only show "all in sync" if there are no warnings either
					this.log(
						chalk.green(
							"✅ All package.json files are already in sync with lockfile",
						),
					);
				}
			}
		} catch (error) {
			if (error instanceof Error) {
				this.error(error.message);
			}
			throw error;
		}
	}

	private async detectPackageManagerFromFlags(): Promise<PackageManager> {
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
		const detected = await detectPackageManager(this.workingDir);
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

	private reportSkippedProjects(
		skippedProjects: Array<{ name: string; path: string; reason: string }>,
	): void {
		for (const skipped of skippedProjects) {
			this.log(chalk.yellow(`Skipping ${skipped.name}: ${skipped.reason}`));
		}
	}

	private reportWarnings(results: SyncResult[]): void {
		for (const result of results) {
			if (result.warnings && result.warnings.length > 0) {
				for (const warning of result.warnings) {
					this.log(chalk.yellow(warning));
				}
			}
		}
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

	private reportChanges(changes: DependencyChange[]): void {
		for (const change of changes) {
			const typePrefix = this.getTypePrefix(change.type);
			this.log(
				`   ${typePrefix} ${change.dep}: ${chalk.red(change.from)} ${chalk.gray("→")} ${chalk.green(change.to)}`,
			);
		}
	}

	private getTypePrefix(type: DependencyChange["type"]): string {
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
