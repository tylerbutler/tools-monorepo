import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import type { Command } from "@oclif/core";
import { type CosmiconfigResult, cosmiconfig } from "cosmiconfig";
import { BaseCommand } from "./baseCommand.js";
import { ConfigFileFlagHidden } from "./flags.js";
import { findGitRoot } from "./git.js";

/**
 * A base command that loads typed configuration values from a config file.
 *
 * @typeParam T - The type for the command.
 * @typeParam C - The type for the command configuration.
 *
 * @beta
 */
export abstract class CommandWithConfig<
	T extends typeof Command & {
		args: typeof CommandWithConfig.args;
		flags: typeof CommandWithConfig.flags;
	},
	C,
> extends BaseCommand<T> {
	private _commandConfig: C | undefined;
	protected configPath: string | undefined;

	static override readonly flags = {
		config: ConfigFileFlagHidden,
		...BaseCommand.flags,
	} as const;

	/**
	 * A default config value to use if none is found. If this returns undefined, no default value will be used.
	 */
	protected defaultConfig: C | undefined;

	protected async loadConfig(
		filePath?: string,
		reload?: boolean,
	): Promise<C | undefined> {
		if (this._commandConfig === undefined || reload === true) {
			const configPath = filePath ?? process.cwd();
			const moduleName = this.config.bin;
			const repoRoot = await findGitRoot();
			const explorer = cosmiconfig(moduleName, {
				searchStrategy: "global",
				stopDir: repoRoot,
			});
			const pathStats = await stat(configPath);
			this.verbose(
				`Looking for '${this.config.bin}' config at '${configPath}'`,
			);
			let config: CosmiconfigResult;
			if (pathStats.isDirectory()) {
				config = await explorer.search(configPath);
			} else {
				config = await explorer.load(configPath);
			}
			if (config?.config !== undefined) {
				this.verbose(`Found config at ${config.filepath}`);
			} else {
				this.verbose(`No config found; started searching at ${configPath}`);
			}
			this._commandConfig = config?.config as C;
		}
		return this._commandConfig;
	}

	protected get commandConfig(): C {
		// TODO: There has to be a better pattern for this.
		assert(
			this._commandConfig !== undefined,
			"commandConfig is undefined; this may happen if loadConfig is not called prior to accessing commandConfig. loadConfig is called from init() - check that code path is called.",
		);
		return this._commandConfig;
	}
}

/**
 * Base class for commands that do not require any configuration.
 *
 * @beta
 *
 * @privateRemarks
 * This class may be an unneeded wrapper around BaseCommand. There's no clear beenfit to using this vs. BaseCommand directly.
 *
 * @deprecated Use the BaseCommand directly.
 */
export abstract class CommandWithoutConfig<
	T extends typeof Command & {
		args: typeof CommandWithoutConfig.args;
		flags: typeof CommandWithoutConfig.flags;
	},
> extends BaseCommand<T> {}

/**
 * An interface implemented by commands that use a context object.
 *
 * @beta
 */
export interface CommandWithContext<CONTEXT> {
	getContext(): Promise<CONTEXT>;
}
