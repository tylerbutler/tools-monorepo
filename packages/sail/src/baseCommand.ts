import process from "node:process";
import { type Command, Flags } from "@oclif/core";
import { CommandWithConfig } from "@tylerbu/cli-api";
import { getSailConfig } from "./core/config.js";
import type { ISailConfig } from "./core/sailConfig.js";

export abstract class BaseSailCommand<
	T extends typeof Command & { flags: typeof BaseSailCommand.flags },
> extends CommandWithConfig<T, ISailConfig> {
	public static override readonly flags = {
		// Hidden flags
		defaultRoot: Flags.directory({
			env: "SAIL_DEFAULT_ROOT",
			hidden: true,
		}),
		root: Flags.directory({
			env: "SAIL_ROOT",
			hidden: true,
		}),
		...CommandWithConfig.flags,
	};

	public override async init(): Promise<void> {
		// Skip the parent's config loading - we have custom logic
		this.requiresConfig = false;
		await super.init();

		// Custom config loading
		const { config: configFlag } = this.flags;
		const searchPath = configFlag ?? process.cwd();
		const { config, configFilePath } = getSailConfig(searchPath, false);

		// Set the config via protected setters
		this.setConfig(config, configFilePath);
	}

	/**
	 * Set the configuration for this command.
	 */
	protected setConfig(config: ISailConfig, configPath: string): void {
		// biome-ignore lint/suspicious/noExplicitAny: Need to access protected properties from parent class
		(this as any)._commandConfig = config;
		// biome-ignore lint/suspicious/noExplicitAny: Need to access protected properties from parent class
		(this as any)._configPath = configPath;
	}
}
