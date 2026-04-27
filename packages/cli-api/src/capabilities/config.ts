import type { BaseCommand } from "../baseCommand.js";
import { loadConfig } from "../loadConfig.js";
import { createLazy, type LazyCapability } from "./capability.js";

/**
 * Branded type to distinguish default config location from regular strings.
 *
 * @beta
 */
export type DefaultConfigLocation = "DEFAULT" & {
	readonly __brand: "DefaultConfigLocation";
};

/**
 * Sentinel value for the default config location.
 *
 * @beta
 */
export const DEFAULT_CONFIG_LOCATION = "DEFAULT" as DefaultConfigLocation;

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
 * Initialize config capability logic shared by useConfig overloads.
 */
async function initializeConfig<
	// biome-ignore lint/suspicious/noExplicitAny: Generic base type needs 'any' to satisfy BaseCommand<T extends typeof Command> constraint
	TCommand extends BaseCommand<any>,
	TConfig,
>(
	command: TCommand,
	options: ConfigCapabilityOptions<TConfig>,
): Promise<ConfigContext<TConfig>> {
	const searchPaths = options.searchPaths ?? [process.cwd()];

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

	if (loaded === undefined && options.defaultConfig === undefined) {
		if (options.required !== false) {
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
		config: options.defaultConfig,
		location: DEFAULT_CONFIG_LOCATION,
	};

	return {
		found: true,
		config: config as TConfig,
		location,
		isDefault: () => location === DEFAULT_CONFIG_LOCATION,
	} satisfies ConfigContextFound<TConfig>;
}

/**
 * Create a config capability for a command.
 *
 * When `required` is `true` (or omitted), the returned capability is narrowed to
 * `ConfigContextFound<TConfig>` since the command will exit if no config is found.
 *
 * @example
 * ```typescript
 * class MyCommand extends BaseCommand {
 *   // required: true (default) — no need to check `found`
 *   private config = useConfig<typeof MyCommand, MyConfig>(this);
 *
 *   async run() {
 *     const { config } = await this.config.get();
 *     console.log(config.foo); // TConfig, not TConfig | undefined
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
	options: ConfigCapabilityOptions<TConfig> & { required: true },
): LazyCapability<ConfigContextFound<TConfig>>;
/**
 * Create a config capability for a command.
 *
 * When `required` is `false`, the returned capability uses the full
 * `ConfigContext<TConfig>` union — check `found` to determine if config was loaded.
 *
 * @beta
 */
export function useConfig<
	// biome-ignore lint/suspicious/noExplicitAny: Generic base type needs 'any' to satisfy BaseCommand<T extends typeof Command> constraint
	TCommand extends BaseCommand<any>,
	TConfig,
>(
	command: TCommand,
	options: ConfigCapabilityOptions<TConfig> & { required: false },
): LazyCapability<ConfigContext<TConfig>>;
/**
 * Create a config capability for a command.
 *
 * When `required` is omitted, defaults to `true` — the returned capability is narrowed to
 * `ConfigContextFound<TConfig>`.
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
): LazyCapability<ConfigContextFound<TConfig>>;
export function useConfig<
	// biome-ignore lint/suspicious/noExplicitAny: Generic base type needs 'any' to satisfy BaseCommand<T extends typeof Command> constraint
	TCommand extends BaseCommand<any>,
	TConfig,
>(
	command: TCommand,
	options?: ConfigCapabilityOptions<TConfig>,
): LazyCapability<ConfigContext<TConfig>> {
	return createLazy(() => initializeConfig(command, options ?? {}), command);
}
