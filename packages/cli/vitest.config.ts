import { mergeConfig } from "vitest/config";
import baseConfig from "../../config/vitest.config.js";

const config = mergeConfig(baseConfig, {
	test: {
		// Required for @oclif/test to capture stdout/stderr correctly
		disableConsoleIntercept: true,
	},
});

// biome-ignore lint/style/noDefaultExport: correct pattern for config files
export default config;
