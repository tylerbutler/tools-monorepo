import { CommandWithConfig } from "@tylerbu/cli-api";

export interface TestConfig {
	stringProperty: string;
}

/**
 * An implementation of CommandWithConfig used for testing.
 */
export default class ConfigTestCommand extends CommandWithConfig<
	typeof ConfigTestCommand,
	TestConfig
> {
	protected override defaultConfig: TestConfig | undefined = {
		stringProperty: "default",
	};

	// biome-ignore lint/suspicious/useAwait: inherited method
	override async run(): Promise<TestConfig | undefined> {
		// if (this.commandConfig === undefined) {
		// 	this.error(`Couldn't find a config file.`);
		// }

		this.log(`Loaded config from: ${this.configLocation}`);
		return this.commandConfig;
	}
}
