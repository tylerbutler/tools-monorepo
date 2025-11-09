import ConfigTestCommand from "./configTest.js";

/**
 * Tests CommandWithConfig when requiresConfig is false (config is optional).
 */
export default class ConfigTestOptionalCommand extends ConfigTestCommand {
	public static override readonly hidden = true;
	protected override requiresConfig = false;
	protected override defaultConfig = undefined;
}
