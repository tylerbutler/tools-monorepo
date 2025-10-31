import { Flags } from "@oclif/core";
import { BaseSailCommand } from "../../baseCommand.js";
import {
	displayCacheStatistics,
	initializeCacheOrFail,
	validateCacheDir,
} from "../../common/cacheUtils.js";

export default class CacheStatsCommand extends BaseSailCommand<
	typeof CacheStatsCommand
> {
	static override readonly description = "Display cache statistics.";

	static override readonly flags = {
		cacheDir: Flags.string({
			description: "Path to shared cache directory.",
			env: "SAIL_CACHE_DIR",
		}),
		...BaseSailCommand.flags,
	} as const;

	static override readonly examples = [
		"<%= config.bin %> <%= command.id %>",
		"<%= config.bin %> <%= command.id %> --cache-dir /path/to/cache",
	];

	public async run(): Promise<void> {
		const { flags } = this;
		const { cacheDir } = flags;

		validateCacheDir(this, cacheDir);

		const sharedCache = await initializeCacheOrFail(this, cacheDir);

		await displayCacheStatistics(this, sharedCache);
	}
}
