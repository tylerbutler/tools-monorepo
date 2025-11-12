import { Flags } from "@oclif/core";
import type { BaseCommand } from "../baseCommand.js";
import { loadConfig } from "../loadConfig.js";
import { Capability, CapabilityHolder } from "./capability.js";

/**
 * Configuration options for config capability.
 */
export interface ConfigCapabilityOptions<TConfig> {
	/**
	 * Default config to use if none is found.
	 */
	defaultConfig?: TConfig;

	/**
	 * Whether config is required. If true and no config is found, command will exit.
	 * @default true
	 */
	required?: boolean;

	/**
	 * Custom search paths for config file. Will search in order.
	 * @default [process.cwd()]
	 */
	searchPaths?: string[];
}

/**
 * Result returned by the config capability.
 */
export interface ConfigResult<TConfig> {
	/**
	 * The loaded configuration.
	 */
	config: TConfig;

	/**
	 * Path to the config file, "DEFAULT" if using default, or undefined if none found.
	 */
	location: string | "DEFAULT" | undefined;

	/**
	 * Check if using default config.
	 */
	isDefault(): boolean;

	/**
	 * Reload the configuration from disk.
	 */
	reload(): Promise<ConfigResult<TConfig>>;
}

/**
 * Config capability implementation.
 */
export class ConfigCapability<TCommand extends BaseCommand<any>, TConfig>
	implements Capability<TCommand, ConfigResult<TConfig>>
{
	constructor(private options: ConfigCapabilityOptions<TConfig> = {}) {}

	async initialize(command: TCommand): Promise<ConfigResult<TConfig>> {
		const searchPaths = this.options.searchPaths ?? [process.cwd()];

		// Try loading from each search path
		let loaded: { config: TConfig; location: string } | undefined;
		for (const searchPath of searchPaths) {
			loaded = await loadConfig<TConfig>(
				command.config.bin,
				searchPath,
				undefined,
			);
			if (loaded) break;
		}

		if (loaded === undefined && this.options.defaultConfig === undefined) {
			if (this.options.required !== false) {
				command.error(
					`Could not find config file in search paths: ${searchPaths.join(", ")}`,
					{ exit: 1 },
				);
			}
			return {
				config: undefined as unknown as TConfig,
				location: undefined,
				isDefault: () => false,
				reload: async () => this.initialize(command),
			};
		}

		const { config, location } = loaded ?? {
			config: this.options.defaultConfig,
			location: "DEFAULT",
		};

		return {
			config: config as TConfig,
			location,
			isDefault: () => location === "DEFAULT",
			reload: async () => this.initialize(command),
		};
	}
}

/**
 * Helper function to create a config capability for a command.
 *
 * @example
 * ```typescript
 * class MyCommand extends BaseCommand {
 *   private config = useConfig<MyConfig>(this, {
 *     defaultConfig: { foo: "bar" },
 *     required: true
 *   });
 *
 *   async run() {
 *     const { config } = await this.config.get();
 *     console.log(config.foo);
 *   }
 * }
 * ```
 */
export function useConfig<TCommand extends BaseCommand<any>, TConfig>(
	command: TCommand,
	options?: ConfigCapabilityOptions<TConfig>,
): CapabilityHolder<TCommand, ConfigResult<TConfig>> {
	return new CapabilityHolder(
		command,
		new ConfigCapability<TCommand, TConfig>(options),
	);
}

/**
 * Config flag that can be added to command flags.
 */
export const ConfigFlag = Flags.string({
	char: "c",
	description: "Path to config file",
	required: false,
});
