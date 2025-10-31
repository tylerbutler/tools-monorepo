import { Flags } from "@oclif/core";
import { BaseSailCommand } from "../../baseCommand.js";
import {
	displayMinimalCacheStatistics,
	initializeCacheOrFail,
	validateCacheDir,
} from "../../common/cacheUtils.js";

export default class CacheCleanCommand extends BaseSailCommand<
	typeof CacheCleanCommand
> {
	static override readonly description =
		"Remove all cache entries. Use --force to confirm.";

	static override readonly flags = {
		cacheDir: Flags.string({
			description: "Path to shared cache directory.",
			env: "SAIL_CACHE_DIR",
		}),
		force: Flags.boolean({
			char: "f",
			description: "Confirm removal of all cache entries.",
			default: false,
			required: true,
		}),
		...BaseSailCommand.flags,
	} as const;

	static override readonly examples = [
		"<%= config.bin %> <%= command.id %> --force",
		"<%= config.bin %> <%= command.id %> --force --cache-dir /path/to/cache",
	];

	public async run(): Promise<void> {
		const { flags } = this;
		const { cacheDir } = flags;

		validateCacheDir(this, cacheDir);

		const sharedCache = await initializeCacheOrFail(
			this,
			cacheDir,
			false, // skipCacheWrite - we need to write when cleaning
		);

		this.log("Cleaning cache...");
		await sharedCache.cleanCache();
		this.log("Cache cleaned successfully.");

		// Display statistics after cleaning (should show 0 entries)
		await displayMinimalCacheStatistics(this, sharedCache);
	}
}
