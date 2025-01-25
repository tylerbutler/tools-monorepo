import assert from "node:assert/strict";
import type { Command } from "@oclif/core";
import { BaseCommand } from "./baseCommand.js";
import { ConfigFileFlagHidden } from "./flags.js";
import { loadConfig } from "./loadConfig.js";

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
		const searchPath = configFlag ?? process.cwd();
		const loaded = await this.loadConfig(searchPath);
		if (loaded === undefined) {
			this.error(`Failure to load config: ${searchPath}`, { exit: 1 });
		}
		const { config, path } = loaded;
		this._commandConfig = config;
		this._configPath = path;
	}

	private async loadConfig(searchPath = process.cwd()): Promise<void> {
		if (this._commandConfig === undefined || this._configPath === undefined) {
			const result = await loadConfig<C>(
				this.config.bin,
				searchPath,
				undefined,
				this.defaultConfig,
			);
			this._commandConfig = result?.config;
			this._configPath = result?.filepath;
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
