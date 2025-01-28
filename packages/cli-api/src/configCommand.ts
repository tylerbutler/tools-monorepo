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
	 * A default config value to use if none is found. If this returns `undefined`, no default value will be used.
	 */
	protected defaultConfig: C | undefined;

	public override async init(): Promise<void> {
		await super.init();
		const { config: configFlag } = this.flags;
		const searchPath = configFlag ?? process.cwd();
		const loaded = await loadConfig<C>(this.config.bin, searchPath, undefined);

		if (loaded === undefined && this.defaultConfig === undefined) {
			this.error(`Failure to load config: ${searchPath}`, { exit: 1 });
		}
		const { config, location } = loaded ?? {
			config: this.defaultConfig,
			location: "DEFAULT",
		};
		this._commandConfig = config;
		this._configPath = location;
	}

	protected get commandConfig(): C | undefined {
		if (this._commandConfig === undefined && this.defaultConfig !== undefined) {
			this._commandConfig = this.defaultConfig;
		}

		return this._commandConfig;
	}

	/**
	 * The location of the config. If the config was loaded from a file, this will be the path to the file. If no config
	 * was loaded, and no default config is defined, this will return `undefined`. If the default config was loaded, this
	 * will return the string "DEFAULT";
	 */
	protected get configLocation(): string | "DEFAULT" | undefined {
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
