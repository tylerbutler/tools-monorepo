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
	protected override defaultConfig: TestConfig = {
		stringProperty: "default",
	};

	// biome-ignore lint/suspicious/useAwait: inherited method
	override async run(): Promise<void> {
		this.log("Succeeded.");
	}
}
