import type { TestConfig } from "../testConfig.js";
import ConfigTestCommand from "./configTest.js";

/**
 * Tests CommandWithConfig loads default configs.
 */
export default class ConfigTestNoDefaultCommand extends ConfigTestCommand {
	protected override defaultConfig = undefined;
}
