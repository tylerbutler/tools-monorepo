/**
 * Command to rename package.json scripts to follow three-tier naming principles
 * Prepares FluidFramework repository for Nx/Turbo migration (Phase 1)
 */

import { Args, Flags } from "@oclif/core";
import { GitCommand } from "@tylerbu/cli-api";
import {
	analyzeTaskNaming,
	applyTaskRenames,
	validateTaskRenames,
	type TaskRenameOptions,
	type TaskRenameResult,
} from "../../lib/fluid-repo-overlay/task-rename.js";

export default class FluidTaskRename extends GitCommand<typeof FluidTaskRename> {
	public static override readonly description =
		"Rename package.json scripts to follow three-tier naming principles (Phase 1 of Nx/Turbo migration)";

	public static override readonly examples = [
		{
			description: "Dry run to see what would change",
			command:
				"<%= config.bin %> <%= command.id %> --repo-dir test-fixtures/FluidFramework --dry-run",
		},
		{
			description: "Apply renames",
			command:
				"<%= config.bin %> <%= command.id %> --repo-dir test-fixtures/FluidFramework",
		},
		{
			description: "Validation only (report issues)",
			command:
				"<%= config.bin %> <%= command.id %> --repo-dir test-fixtures/FluidFramework --validate-only",
		},
	];

	public static override readonly flags = {
		...GitCommand.flags,
		"repo-dir": Flags.string({
			description: "Path to FluidFramework repository",
			required: true,
		}),
		"dry-run": Flags.boolean({
			description: "Show changes without applying them",
			default: false,
		}),
		"validate-only": Flags.boolean({
			description: "Check for naming issues without renaming",
			default: false,
		}),
		"skip-cross-refs": Flags.boolean({
			description: "Don't update cross-references (faster, less safe)",
			default: false,
		}),
	};

	public override async run(): Promise<void> {
		const { flags } = this;

		this.info("📋 Analyzing FluidFramework repository...");

		// Analyze current naming patterns
		const analysis = await analyzeTaskNaming(flags["repo-dir"], this);

		this.info(`  ✓ Found ${analysis.totalPackages} packages`);
		this.info(`  ✓ Analyzed ${analysis.totalScripts} scripts`);

		// Report issues found
		if (analysis.issues.length > 0) {
			this.warning("\n⚠️  Naming Issues Found:");
			for (const issue of analysis.issues) {
				this.warning(`  ${issue}`);
			}
		}

		// Validation only mode
		if (flags["validate-only"]) {
			this.info("\n✅ Validation complete");
			if (analysis.issues.length === 0) {
				this.info("  All scripts follow three-tier naming principles");
			}
			return;
		}

		// Show rename plan
		if (analysis.renames.length === 0) {
			this.info("\n✅ No renames needed - all scripts already follow principles");
			return;
		}

		this.info("\n🔄 Rename Plan:");
		const renamesByType = new Map<string, number>();
		for (const rename of analysis.renames) {
			const count = renamesByType.get(rename.from) ?? 0;
			renamesByType.set(rename.from, count + 1);
		}

		for (const [from, count] of renamesByType.entries()) {
			const to = analysis.renames.find((r) => r.from === from)?.to ?? "";
			this.info(`  ${from} → ${to} (${count} packages)`);
		}

		if (analysis.crossRefUpdates > 0 && !flags["skip-cross-refs"]) {
			this.info(
				`\n📝 Cross-Reference Updates: ${analysis.crossRefUpdates} scripts`,
			);
		}

		// Dry run mode
		if (flags["dry-run"]) {
			this.info("\n✅ Dry run complete - no changes applied");
			return;
		}

		// Confirm if not in CI
		if (!process.env["CI"]) {
			this.warning("\n⚠️  This will modify package.json files in the repository");
			// Note: In real implementation, add confirmation prompt
			// For now, proceeding with changes
		}

		// Apply renames
		const options: TaskRenameOptions = {
			repoDir: flags["repo-dir"],
			skipCrossRefs: flags["skip-cross-refs"],
			dryRun: false,
		};

		this.info("\n🔧 Applying renames...");
		const result: TaskRenameResult = await applyTaskRenames(options, this);

		this.info(`  ✓ Modified ${result.packagesModified} packages`);
		this.info(`  ✓ Renamed ${result.scriptsRenamed} scripts`);
		if (result.crossRefsUpdated > 0) {
			this.info(`  ✓ Updated ${result.crossRefsUpdated} cross-references`);
		}

		// Validate changes
		this.info("\n✅ Validation:");
		const validation = await validateTaskRenames(flags["repo-dir"], this);

		for (const check of validation.checks) {
			const icon = check.passed ? "✓" : "✗";
			this.info(`  ${icon} ${check.name}`);
			if (!check.passed && check.details) {
				this.warning(`     ${check.details}`);
			}
		}

		// Summary
		this.info("\n📊 Summary:");
		this.info(`  Renamed: ${result.scriptsRenamed} scripts across ${result.packagesModified} packages`);
		if (result.crossRefsUpdated > 0) {
			this.info(`  Updated cross-refs: ${result.crossRefsUpdated} scripts`);
		}
		this.info(`  Files modified: ${result.filesModified}`);

		// Next steps
		this.info("\n💡 Next steps:");
		this.info("1. Review changes: git diff");
		this.info("2. Test builds: pnpm build");
		this.info("3. Commit changes: git add . && git commit");
		this.info("4. Create PR to FluidFramework");
		this.info("5. After merge, run Phase 2 (nx/turbo overlay)");

		if (!validation.allPassed) {
			this.warning("\n⚠️  Some validation checks failed - review before proceeding");
			this.exit(1);
		}
	}
}
