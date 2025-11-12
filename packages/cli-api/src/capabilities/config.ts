import { Flags } from "@oclif/core";
import type { BaseCommand } from "../baseCommand.js";
import { loadConfig } from "../loadConfig.js";
import { type Capability, CapabilityWrapper } from "./capability.js";

/**
 * Branded type to distinguish default config location from regular strings.
 *
 * @beta
 */
export type DefaultConfigLocation = "DEFAULT" & {
	readonly __brand: "DefaultConfigLocation";
};

/**
 * Configuration options for config capability.
 *
 * @beta
 */
export interface ConfigCapabilityOptions<TConfig> {
	/**
	 * Default config to use if none is found.
	 */
	defaultConfig?: TConfig;

	/**
	 * Whether config is required. If true and no config is found, command will exit.
	 * @defaultValue true
	 */
	required?: boolean;

	/**
	 * Custom search paths for config file. Will search in order.
	 * @defaultValue [process.cwd()]
	 */
	searchPaths?: string[];
}

/**
 * Context returned by the config capability.
 *
 * @beta
 */
export interface ConfigContext<TConfig> {
	/**
	 * The loaded configuration.
	 */
	config: TConfig;

	/**
	 * Path to the config file, "DEFAULT" if using default, or undefined if none found.
	 */
	location: string | DefaultConfigLocation | undefined;

	/**
	 * Check if using default config.
	 * @returns True if the config used is the default, false otherwise.
	 */
	isDefault(): boolean;

	/**
	 * Reload the configuration from disk.
	 */
	reload(): Promise<ConfigContext<TConfig>>;
}

/**
 * Config capability implementation.
 *
 * @beta
 */
export class ConfigCapability<
	// biome-ignore lint/suspicious/noExplicitAny: Generic base type needs 'any' to satisfy BaseCommand<T extends typeof Command> constraint
	TCommand extends BaseCommand<any>,
	TConfig,
> implements Capability<TCommand, ConfigContext<TConfig>>
{
	public constructor(private options: ConfigCapabilityOptions<TConfig> = {}) {}

	public async initialize(command: TCommand): Promise<ConfigContext<TConfig>> {
		const searchPaths = this.options.searchPaths ?? [process.cwd()];

		// Try loading from each search path
		let loaded: { config: TConfig; location: string } | undefined;
		for (const searchPath of searchPaths) {
			loaded = await loadConfig<TConfig>(
				command.config.bin,
				searchPath,
				undefined,
			);
			if (loaded) {
				break;
			}
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
			location: "DEFAULT" as DefaultConfigLocation,
		};

		return {
			config: config as TConfig,
			location,
			isDefault: () => location === ("DEFAULT" as DefaultConfigLocation),
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
 *
 * @beta
 */
export function useConfig<
	// biome-ignore lint/suspicious/noExplicitAny: Generic base type needs 'any' to satisfy BaseCommand<T extends typeof Command> constraint
	TCommand extends BaseCommand<any>,
	TConfig,
>(
	command: TCommand,
	options?: ConfigCapabilityOptions<TConfig>,
): CapabilityWrapper<TCommand, ConfigContext<TConfig>> {
	return new CapabilityWrapper(
		command,
		new ConfigCapability<TCommand, TConfig>(options),
	);
}

/**
 * Config flag that can be added to command flags.
 *
 * @beta
 */
export const ConfigFlag = Flags.string({
	char: "c",
	description: "Path to config file",
	required: false,
});
