import { defineConfig, mergeConfig } from "vitest/config";
import defaultConfig from "../../config/vitest.config.js";

export default mergeConfig(
	defaultConfig,
	defineConfig({
		test: {
			environment: "node",
		},
	}),
);
