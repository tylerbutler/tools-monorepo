import type { TestConfigSchema } from "../../common.js";

const config: TestConfigSchema = {
	stringProperty: "stringValue",
};

// biome-ignore lint/style/noDefaultExport: correct pattern for config files
export default config;
