import { existsSync } from "node:fs";
import { Flags } from "@oclif/core";
import { BaseSailCommand } from "../../baseCommand.js";
import {
	displayCacheStatistics,
	initializeCacheOrFail,
} from "../../common/cacheUtils.js";

export default class CacheInfoCommand extends BaseSailCommand<
	typeof CacheInfoCommand
> {
	public static override readonly description =
		"Display cache configuration and location information.";

	public static override readonly flags = {
		cacheDir: Flags.string({
			description: "Path to shared cache directory.",
			env: "SAIL_CACHE_DIR",
		}),
		...BaseSailCommand.flags,
	} as const;

	public static override readonly examples = [
		"<%= config.bin %> <%= command.id %>",
		"<%= config.bin %> <%= command.id %> --cache-dir /path/to/cache",
	];

	public async run(): Promise<void> {
		const { flags } = this;
		const { cacheDir } = flags;

		this.log("\n=== Cache Configuration ===");

		// Display cache directory
		if (cacheDir) {
			this.log(`Cache Directory: ${cacheDir}`);
			this.log(`Directory Exists: ${existsSync(cacheDir) ? "Yes" : "No"}`);
			// Note: The flag may come from either env var or CLI flag
			this.log(
				"Source: --cache-dir flag or SAIL_CACHE_DIR environment variable",
			);
		} else {
			this.log("Cache Directory: Not configured");
			this.log(
				"Set SAIL_CACHE_DIR environment variable or use --cache-dir flag",
			);
		}

		this.log(`Current Working Directory: ${process.cwd()}`);
		this.log("===========================\n");

		// If cache is configured, try to get statistics
		if (cacheDir && existsSync(cacheDir)) {
			try {
				const sharedCache = await initializeCacheOrFail(this, cacheDir);
				await displayCacheStatistics(this.logger, sharedCache);
			} catch (error) {
				this.log("Failed to read cache statistics:");
				this.log(error instanceof Error ? error.message : String(error));
			}
		}
	}
}
