import { type Command, Flags } from "@oclif/core";
import { CommandWithConfig } from "@tylerbu/cli-api";
import { getSailConfig } from "./core/config.js";
import type { ISailConfig } from "./core/sailConfig.js";

export abstract class BaseSailCommand<
	T extends typeof Command & { flags: typeof BaseSailCommand.flags },
> extends CommandWithConfig<T, ISailConfig> {
	static override readonly flags = {
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

	// protected override async init(): Promise<void> {
	// 	await super.init();
	// 	const {buildProject: bpjConfig} = this.commandConfig;
	// 	const buildProject = loadBuildProject<BuildPackage>(, false);
	// }
	protected override async loadConfig(
		filePath: string,
		reload?: boolean,
	): Promise<ISailConfig | undefined> {
		const { config, configFilePath } = getSailConfig(filePath, reload ?? false);
		this.configPath = configFilePath;
		return config;
	}

	// protected get defaultConfig(): ISailConfig {
	// 	return
	// }
}
