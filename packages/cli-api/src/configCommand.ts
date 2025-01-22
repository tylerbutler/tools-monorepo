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
	private _configPath: string | undefined;

	static override readonly flags = {
		config: ConfigFileFlagHidden,
		...BaseCommand.flags,
	} as const;

	/**
	 * A default config value to use if none is found. If this returns undefined, no default value will be used.
	 */
	protected defaultConfig: C | undefined;

	public override async init(): Promise<void> {
		await super.init();
		const { config: configFlag } = this.flags;
		const loaded = await this.loadConfig(configFlag);
		if (loaded === undefined) {
			this.error(`Failure to load config: ${configFlag}`, { exit: 1 });
		}
		const { config, path } = loaded;
		this._commandConfig = config;
		this._configPath = path;
	}

	private async loadConfig(
		searchPath = process.cwd(),
		reload?: boolean,
	): Promise<{ config: C; path: string } | undefined> {
		if (this._commandConfig === undefined || reload === true) {
			const moduleName = this.config.bin;
			const repoRoot = await findGitRoot();
			const explorer = cosmiconfig(moduleName, {
				searchStrategy: "global",
				stopDir: repoRoot,
			});
			const pathStats = await stat(searchPath);
			this.verbose(
				`Looking for '${this.config.bin}' config at '${searchPath}'`,
			);
			const config: CosmiconfigResult = pathStats.isDirectory()
				? await explorer.search(searchPath)
				: await explorer.load(searchPath);

			if (config?.config !== undefined) {
				this.verbose(`Found config at ${config.filepath}`);
			} else {
				this.verbose(`No config found; started searching at ${searchPath}`);
				if (this.defaultConfig === undefined) {
					return undefined;
				}
				return { config: this.defaultConfig, path: "" };
			}
			return { config: config.config as C, path: config.filepath };
		}
	}

	protected get commandConfig(): C {
		// TODO: There has to be a better pattern for this.
		assert(
			this._commandConfig !== undefined,
			"commandConfig is undefined; this may happen if loadConfig is not called prior to accessing commandConfig. loadConfig is called from init() - check that code path is called.",
		);
		return this._commandConfig;
	}

	protected get configPath(): string | undefined {
		return this._configPath;
	}
}

/**
 * An interface implemented by commands that use a context object.
 *
 * @beta
 */
export interface CommandWithContext<CONTEXT> {
	getContext(): Promise<CONTEXT>;
}
