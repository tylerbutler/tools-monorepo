import { Flags } from "@oclif/core";
import { BaseSailCommand } from "../../baseCommand.js";
import { initializeCacheOrFail, validateCacheDir } from "./utils.js";

export default class CacheVerifyCommand extends BaseSailCommand<
	typeof CacheVerifyCommand
> {
	static override readonly description =
		"Verify cache integrity (check for corruption).";

	static override readonly flags = {
		cacheDir: Flags.string({
			description: "Path to shared cache directory.",
			env: "SAIL_CACHE_DIR",
		}),
		fix: Flags.boolean({
			description: "Fix corrupted cache entries. Requires --force to confirm.",
			default: false,
		}),
		force: Flags.boolean({
			char: "f",
			description: "Confirm fixing corrupted cache entries when using --fix.",
			default: false,
		}),
		...BaseSailCommand.flags,
	} as const;

	static override readonly examples = [
		"<%= config.bin %> <%= command.id %>",
		"<%= config.bin %> <%= command.id %> --fix --force",
		"<%= config.bin %> <%= command.id %> --cache-dir /path/to/cache",
	];

	public async run(): Promise<void> {
		const { flags } = this;
		const { cacheDir, fix, force } = flags;

		validateCacheDir(this, cacheDir);

		// Require --force when --fix is used
		if (fix && !force) {
			this.error("The --fix flag requires --force to confirm the operation.", {
				exit: 1,
			});
		}

		const sharedCache = await initializeCacheOrFail(
			this,
			cacheDir,
			!fix, // skipCacheWrite - only write if fixing
		);

		const result = await sharedCache.verifyCache(fix);

		// Display summary
		this.log("\n=== Verification Results ===");
		this.log(`Total Entries: ${result.total}`);
		this.log(`Valid Entries: ${result.valid}`);
		this.log(`Corrupted Entries: ${result.corrupted}`);
		if (fix) {
			this.log(`Fixed Entries: ${result.fixed}`);
		}
		this.log("============================\n");

		// Exit with error code if there are corrupted entries and we didn't fix them
		if (result.corrupted > 0 && !fix) {
			this.log("Run with --fix to remove corrupted entries.");
			this.exit(1);
		}
	}
}
