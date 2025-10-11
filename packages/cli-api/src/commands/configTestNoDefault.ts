import ConfigTestCommand from "./configTest.ts";

/**
 * Tests CommandWithConfig loads default configs.
 */
export default class ConfigTestNoDefaultCommand extends ConfigTestCommand {
	protected override defaultConfig = undefined;
}
