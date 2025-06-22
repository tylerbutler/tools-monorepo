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

	public override async run(): Promise<TestConfig | undefined> {
		this.log(`Loaded config from: ${this.configLocation}`);
		return this.commandConfig;
	}
}
