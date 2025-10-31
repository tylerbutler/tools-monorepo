import { Flags } from "@oclif/core";
import { BaseSailCommand } from "../../baseCommand.js";
import {
	displayMinimalCacheStatistics,
	initializeCacheOrFail,
	validateCacheDir,
} from "./utils.js";

export default class CachePruneCommand extends BaseSailCommand<
	typeof CachePruneCommand
> {
	static override readonly description =
		"Prune old cache entries based on age and size limits.";

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

		const sharedCache = await initializeCacheOrFail(
			this,
			cacheDir,
			false, // skipCacheWrite - we need to write when pruning
		);

		this.log("Pruning cache...");
		const prunedCount = await sharedCache.pruneCache();
		this.log(`Pruned ${prunedCount} cache entries.`);

		// Display statistics after pruning
		await displayMinimalCacheStatistics(this, sharedCache);
	}
}
