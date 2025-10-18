import { mergeConfig } from "vitest/config";
import baseConfig from "../../config/vitest.config.js";

const config = mergeConfig(baseConfig, {
	test: {
		// Additional package-specific configuration if needed
	},
});

// biome-ignore lint/style/noDefaultExport: correct pattern for config files
export default config;
