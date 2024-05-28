import { existsSync } from "node:fs";
import type { Command } from "@oclif/core";
import { type CosmiconfigResult, cosmiconfig } from "cosmiconfig";
import { BaseCommand } from "./baseCommand.js";

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
		args: typeof CommandWithConfig.arguments;
		flags: typeof CommandWithConfig.flags;
	},
	C = unknown,
> extends BaseCommand<T> {
	private _commandConfig: C | undefined;
	protected configPath: string | undefined;

	public override async init(): Promise<void> {
		await super.init();
		this.commandConfig = await this.loadConfig();
	}

	protected async loadConfig(): Promise<C | undefined> {
		const configPath = this.config.configDir; // path.join(this.config.configDir, "config.ts");
		// const config = await this.loadConfigFromFile(this.config.configDir);
		const moduleName = this.config.bin;
		const explorer = cosmiconfig(moduleName, {
			searchStrategy: "global",
		});
		this.verbose(`Looking for '${this.config.bin}' config at '${configPath}'`);
		if (existsSync(configPath)) {
			const config: CosmiconfigResult = await explorer.search(configPath);
			if (config?.config !== undefined) {
				this.verbose(`Found config at ${config.filepath}`);
			}
			return config?.config as C | undefined;
		}
	}

	// private async loadConfigFromFile(
	// 	configPath: string,
	// ): Promise<C | undefined> {
	// }

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
		args: typeof CommandWithoutConfig.arguments;
		flags: typeof CommandWithoutConfig.flags;
	},
> extends BaseCommand<T> {}
