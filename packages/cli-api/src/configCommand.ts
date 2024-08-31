import { stat } from "node:fs/promises";
import type { Command } from "@oclif/core";
import { type CosmiconfigResult, cosmiconfig } from "cosmiconfig";
import { BaseCommand } from "./baseCommand.js";
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
	C = unknown,
> extends BaseCommand<T> {
	private _commandConfig: C | undefined;
	protected configPath: string | undefined;

	public override async init(): Promise<void> {
		await super.init();
		const { config } = this.flags;
		this.commandConfig = await this.loadConfig(config);
	}

	protected async loadConfig(filePath?: string): Promise<C | undefined> {
		const configPath = filePath ?? process.cwd();
		const moduleName = this.config.bin;
		const repoRoot = await findGitRoot();
		const explorer = cosmiconfig(moduleName, {
			searchStrategy: "global",
			stopDir: repoRoot,
		});
		const pathStats = await stat(configPath);
		this.verbose(`Looking for '${this.config.bin}' config at '${configPath}'`);
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
		return config?.config as C | undefined;
	}

	protected get defaultConfig(): C | undefined {
		return undefined;
	}

	protected get commandConfig(): C | undefined {
		return this._commandConfig;
	}

	protected set commandConfig(value: C | undefined) {
		this._commandConfig = value;
	}
}

/**
 * Base class for commands that do not require any configuration.
 *
 * @beta
 */
export abstract class CommandWithoutConfig<
	T extends typeof Command & {
		args: typeof CommandWithoutConfig.args;
		flags: typeof CommandWithoutConfig.flags;
	},
> extends BaseCommand<T> {}
