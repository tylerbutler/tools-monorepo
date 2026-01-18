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
 * Context returned by the config capability when a config was found or defaults were used.
 *
 * @beta
 */
export interface ConfigContextFound<TConfig> {
	/**
	 * Whether a configuration was found (or default was used).
	 * When true, `config` is guaranteed to be defined.
	 */
	found: true;

	/**
	 * The loaded configuration.
	 */
	config: TConfig;

	/**
	 * Path to the config file, or "DEFAULT" if using default config.
	 */
	location: string | DefaultConfigLocation;

	/**
	 * Check if using default config.
	 * @returns True if the config used is the default, false otherwise.
	 */
	isDefault(): boolean;
}

/**
 * Context returned by the config capability when no config was found and none was required.
 *
 * @beta
 */
export interface ConfigContextNotFound {
	/**
	 * Whether a configuration was found.
	 * When false, `config` is undefined.
	 */
	found: false;

	/**
	 * The configuration value. Undefined when no config was found.
	 */
	config: undefined;

	/**
	 * The location of the config file. Undefined when no config was found.
	 */
	location: undefined;

	/**
	 * Check if using default config.
	 * @returns Always false when no config was found.
	 */
	isDefault(): false;
}

/**
 * Context returned by the config capability.
 * Use the `found` discriminator to determine if a config was loaded.
 *
 * @example
 * ```typescript
 * const ctx = await configCapability.get();
 * if (ctx.found) {
 *   // TypeScript knows ctx.config is TConfig here
 *   console.log(ctx.config);
 * } else {
 *   // TypeScript knows ctx.config is undefined here
 *   console.log("No config found");
 * }
 * ```
 *
 * @beta
 */
export type ConfigContext<TConfig> =
	| ConfigContextFound<TConfig>
	| ConfigContextNotFound;

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
				found: false,
				config: undefined,
				location: undefined,
				isDefault: () => false,
			} satisfies ConfigContextNotFound;
		}

		const { config, location } = loaded ?? {
			config: this.options.defaultConfig,
			location: "DEFAULT" as DefaultConfigLocation,
		};

		return {
			found: true,
			config: config as TConfig,
			location,
			isDefault: () => location === ("DEFAULT" as DefaultConfigLocation),
		} satisfies ConfigContextFound<TConfig>;
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
 * A simple string flag for specifying a config file path.
 * This is a convenience flag that can be added to command flags.
 *
 * Use this flag when you want a simple `-c` shorthand for config files.
 * For a flag that validates the file exists and groups under CONFIGURATION,
 * use {@link ConfigFileFlag} from the main module instead.
 *
 * @example
 * ```typescript
 * import { ConfigFlag } from "@tylerbu/cli-api/capabilities";
 *
 * class MyCommand extends BaseCommand {
 *   static flags = {
 *     config: ConfigFlag,  // Adds -c, --config <path>
 *   };
 * }
 * ```
 *
 * @see {@link ConfigFileFlag} from "@tylerbu/cli-api" for a flag that validates file existence
 *
 * @beta
 */
export const ConfigFlag = Flags.string({
	char: "c",
	description: "Path to config file",
	required: false,
});
