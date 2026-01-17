import type { Command } from "@oclif/core";
import { CommandWithConfig } from "@tylerbu/cli-api";

export interface TestConfig {
	stringProperty: string;
}

// Workaround for error() override breaking type constraints
type ConfigTestCommandType = typeof Command & {
	args: typeof CommandWithConfig.args;
	flags: typeof CommandWithConfig.flags;
};

/**
 * An implementation of CommandWithConfig used for testing.
 */
export default abstract class ConfigTestCommand extends CommandWithConfig<
	ConfigTestCommandType,
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
