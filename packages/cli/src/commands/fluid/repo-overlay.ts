/**
 * Repository Overlay Command for OCLIF
 *
 * This command applies overlay configurations to the FluidFramework repository.
 * It can be run multiple times as the repository evolves - it will only apply changes that
 * haven't been applied yet.
 *
 * Usage:
 *   tbu fluid repo-overlay nx [options]
 */

import { resolve } from "node:path";
import process from "node:process";
import { Args, Command, Flags } from "@oclif/core";
import {
	copyNxConfigFiles,
	isNxConfigured,
} from "../../lib/fluid-repo-overlay/config-files.js";
import {
	copyTurboConfigFiles,
	isTurboConfigured,
} from "../../lib/fluid-repo-overlay/config-files-turbo.js";
import {
	needsGitignoreUpdate,
	updateGitignore,
} from "../../lib/fluid-repo-overlay/gitignore.js";
import {
	needsGitignoreUpdateForTurbo,
	updateGitignoreForTurbo,
} from "../../lib/fluid-repo-overlay/gitignore-turbo.js";
import {
	needsPackageJsonUpdates,
	updatePackageJsonFiles,
	updateRootPackageJson,
} from "../../lib/fluid-repo-overlay/package-json.js";
import {
	needsPackageJsonUpdatesForTurbo,
	updatePackageJsonFilesForTurbo,
	updateRootPackageJsonForTurbo,
} from "../../lib/fluid-repo-overlay/package-json-turbo.js";

const VALID_OVERLAY_TYPES = ["nx", "turbo"] as const;
type OverlayType = (typeof VALID_OVERLAY_TYPES)[number];

export default class RepoOverlayCommand extends Command {
	public static override readonly description =
		"Apply overlay configurations to the FluidFramework repository";

	public static override readonly args = {
		type: Args.string({
			description: "Type of overlay to apply",
			required: true,
			options: [...VALID_OVERLAY_TYPES],
		}),
	};

	public static override readonly flags = {
		"repo-dir": Flags.string({
			description:
				"Path to the repository directory (defaults to current working directory)",
			required: false,
		}),
		"dry-run": Flags.boolean({
			description: "Show what would be changed without making changes",
			default: false,
		}),
	};

	public async run(): Promise<void> {
		const { args, flags } = await this.parse(RepoOverlayCommand);
		const overlayType = args.type as OverlayType;

		// Use provided repo directory or default to current working directory
		const repoRoot = flags["repo-dir"]
			? resolve(flags["repo-dir"])
			: process.cwd();

		// Route to the appropriate overlay handler
		switch (overlayType) {
			case "nx":
				await this.applyNxOverlay(repoRoot, flags["dry-run"]);
				break;
			case "turbo":
				await this.applyTurboOverlay(repoRoot, flags["dry-run"]);
				break;
			default:
				// This should never happen due to Args validation, but TypeScript doesn't know that
				this.error(`Unsupported overlay type: ${overlayType}`);
		}
	}

	/**
	 * Apply the nx overlay to the repository
	 */
	private async applyNxOverlay(
		repoRoot: string,
		dryRun: boolean,
	): Promise<void> {
		this.log("🚀 Nx Overlay Script");
		this.log(`📁 Repository root: ${repoRoot}`);
		this.log("");

		if (dryRun) {
			this.log("🔍 DRY RUN MODE - No changes will be made\n");
			await this.performNxDryRun(repoRoot);
		} else {
			await this.applyNxOverlayImpl(repoRoot);
		}

		this.log("\n✨ Done!");
	}

	/**
	 * Perform a dry run to show what nx changes would be made
	 */
	private async performNxDryRun(repoRoot: string): Promise<void> {
		this.log("Checking what changes would be made...\n");

		const checks = [
			{
				name: "nx.json configuration",
				check: async () => !(await isNxConfigured(repoRoot)),
			},
			{
				name: "Root package.json updates",
				check: async () => await needsPackageJsonUpdates(repoRoot),
			},
			{
				name: ".gitignore updates",
				check: async () => await needsGitignoreUpdate(repoRoot),
			},
		];

		let changesNeeded = false;

		for (const { name, check } of checks) {
			const needsChange = await check();
			if (needsChange) {
				this.log(`  ⚠️  ${name} - NEEDS UPDATE`);
				changesNeeded = true;
			} else {
				this.log(`  ✅ ${name} - Already applied`);
			}
		}

		this.log(
			"\n📦 Package.json files - Would scan and update files with fluidBuild sections",
		);

		if (changesNeeded) {
			this.log("\n💡 Run without --dry-run to apply these changes");
			this.log("💡 After applying, run: pnpm install");
		} else {
			this.log("\n✨ All nx configuration is already applied!");
		}
	}

	/**
	 * Apply the nx overlay changes to the repository
	 */
	private async applyNxOverlayImpl(repoRoot: string): Promise<void> {
		this.log("Applying nx overlay...\n");

		try {
			// Step 1: Copy nx configuration files
			await copyNxConfigFiles(repoRoot, this);
			this.log("");

			// Step 2: Update root package.json
			await updateRootPackageJson(repoRoot, this);
			this.log("");

			// Step 3: Update .gitignore
			await updateGitignore(repoRoot, this);
			this.log("");

			// Step 4: Update package.json files
			await updatePackageJsonFiles(repoRoot, this);
			this.log("");

			this.log("✅ Nx overlay applied successfully!");
			this.log("");
			this.log("Next steps:");
			this.log("  1. Run: pnpm install");
			this.log("  2. Test the build: nx run-many -t build");
			this.log("  3. Commit the changes");
		} catch (error) {
			this.error(`\n❌ Error applying overlay: ${error}`);
		}
	}

	/**
	 * Apply the turbo overlay to the repository
	 */
	private async applyTurboOverlay(
		repoRoot: string,
		dryRun: boolean,
	): Promise<void> {
		this.log("🚀 Turbo Overlay Script");
		this.log(`📁 Repository root: ${repoRoot}`);
		this.log("");

		if (dryRun) {
			this.log("🔍 DRY RUN MODE - No changes will be made\n");
			await this.performTurboDryRun(repoRoot);
		} else {
			await this.applyTurboOverlayImpl(repoRoot);
		}

		this.log("\n✨ Done!");
	}

	/**
	 * Perform a dry run to show what turbo changes would be made
	 */
	private async performTurboDryRun(repoRoot: string): Promise<void> {
		this.log("Checking what changes would be made...\n");

		const checks = [
			{
				name: "turbo.jsonc configuration",
				check: async () => !(await isTurboConfigured(repoRoot)),
			},
			{
				name: "Root package.json updates",
				check: async () => await needsPackageJsonUpdatesForTurbo(repoRoot),
			},
			{
				name: ".gitignore updates",
				check: async () => await needsGitignoreUpdateForTurbo(repoRoot),
			},
		];

		let changesNeeded = false;

		for (const { name, check } of checks) {
			const needsChange = await check();
			if (needsChange) {
				this.log(`  ⚠️  ${name} - NEEDS UPDATE`);
				changesNeeded = true;
			} else {
				this.log(`  ✅ ${name} - Already applied`);
			}
		}

		this.log(
			"\n📦 Package.json files - Would scan and remove fluid-build references",
		);

		if (changesNeeded) {
			this.log("\n💡 Run without --dry-run to apply these changes");
			this.log("💡 After applying, run: pnpm install");
		} else {
			this.log("\n✨ All turbo configuration is already applied!");
		}
	}

	/**
	 * Apply the turbo overlay changes to the repository
	 */
	private async applyTurboOverlayImpl(repoRoot: string): Promise<void> {
		this.log("Applying turbo overlay...\n");

		try {
			// Step 1: Copy turbo configuration files
			await copyTurboConfigFiles(repoRoot, this);
			this.log("");

			// Step 2: Update root package.json
			await updateRootPackageJsonForTurbo(repoRoot, this);
			this.log("");

			// Step 3: Update .gitignore
			await updateGitignoreForTurbo(repoRoot, this);
			this.log("");

			// Step 4: Update package.json files
			await updatePackageJsonFilesForTurbo(repoRoot, this);
			this.log("");

			this.log("✅ Turbo overlay applied successfully!");
			this.log("");
			this.log("Next steps:");
			this.log("  1. Run: pnpm install");
			this.log("  2. Test the build: turbo run build");
			this.log("  3. Commit the changes");
		} catch (error) {
			this.error(`\n❌ Error applying overlay: ${error}`);
		}
	}
}
