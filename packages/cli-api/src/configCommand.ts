import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import type { Command } from "@oclif/core";
import { createJiti } from "jiti";
import {
	type LilconfigResult,
	type Loader,
	type LoaderResult,
	lilconfig,
} from "lilconfig";
import { BaseCommand } from "./baseCommand.js";
import { ConfigFileFlagHidden } from "./flags.js";
import { findGitRoot } from "./git.js";

// barebones ts-loader
const jiti = createJiti(import.meta.url);
const tsLoader: Loader = async (
	filepath: string,
	_content: string,
): Promise<LoaderResult> => {
	const modDefault = await jiti.import(filepath, { default: true });
	return modDefault;
};

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
	protected configPath: string | undefined;

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
		const { config } = this.flags;
		const loaded = await this.loadConfig(config);
		if (loaded === undefined) {
			this.error(`Failure to load config: ${config}`, { exit: 1 });
		}
	}

	protected async loadConfig(
		searchPath?: string,
		reload?: boolean,
	): Promise<C | undefined> {
		if (this._commandConfig === undefined || reload === true) {
			const configPath = searchPath ?? process.cwd();
			const moduleName = this.config.bin;
			const repoRoot = await findGitRoot();
			const configLoader = lilconfig(moduleName, {
				stopDir: repoRoot,
				searchPlaces: [
					`${moduleName}.config.ts`,
					`${moduleName}.config.mjs`,
					`${moduleName}.config.cjs`,
					`${moduleName}.config.js`,
					"package.json",
				],
				loaders: {
					".ts": tsLoader,
				},
			});
			const pathStats = await stat(configPath);
			this.verbose(
				`Looking for '${this.config.bin}' config at '${configPath}'`,
			);
			let maybeConfig: LilconfigResult;
			if (pathStats.isDirectory()) {
				maybeConfig = await configLoader.search(configPath);
			} else {
				maybeConfig = await configLoader.load(configPath);
			}
			if (maybeConfig?.config !== undefined) {
				this.verbose(`Found config at ${maybeConfig?.filepath}`);
			} else {
				this.verbose(`No config found; started searching at ${configPath}`);
			}
			this._commandConfig = maybeConfig?.config ?? this.defaultConfig;
		}
		return this._commandConfig;
	}

	protected get commandConfig(): C {
		// TODO: There has to be a better pattern for this.
		assert(
			this._commandConfig !== undefined,
			"commandConfig is undefined; this may happen if loadConfig is not called prior to accessing commandConfig. loadConfig is called from init() - check that code path is called.",
		);
		return this._commandConfig;
	}
}

/**
 * Base class for commands that do not require any configuration.
 *
 * @beta
 *
 * @privateRemarks
 * This class may be an unneeded wrapper around BaseCommand. There's no clear beenfit to using this vs. BaseCommand directly.
 *
 * @deprecated Use the BaseCommand directly.
 */
export abstract class CommandWithoutConfig<
	T extends typeof Command & {
		args: typeof CommandWithoutConfig.args;
		flags: typeof CommandWithoutConfig.flags;
	},
> extends BaseCommand<T> {}

/**
 * An interface implemented by commands that use a context object.
 *
 * @beta
 */
export interface CommandWithContext<CONTEXT> {
	getContext(): Promise<CONTEXT>;
}

export async function loadConfig<C>(
	moduleName: string,
	searchPath?: string,
	// reload?: boolean,
	defaultConfig?: C,
): Promise<C | undefined> {
	const configPath = searchPath ?? process.cwd();
	const repoRoot = await findGitRoot();
	const configLoader = lilconfig(moduleName, {
		stopDir: repoRoot,
		searchPlaces: [
			`${moduleName}.config.ts`,
			`${moduleName}.config.mjs`,
			`${moduleName}.config.cjs`,
			`${moduleName}.config.js`,
			"package.json",
		],
		loaders: {
			".ts": tsLoader,
		},
	});
	const pathStats = await stat(configPath);

	let maybeConfig: LilconfigResult;
	if (pathStats.isDirectory()) {
		maybeConfig = await configLoader.search(configPath);
	} else {
		maybeConfig = await configLoader.load(configPath);
	}
	return maybeConfig?.config ?? defaultConfig;
}
