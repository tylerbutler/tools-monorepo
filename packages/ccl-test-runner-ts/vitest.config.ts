import { defineConfig, mergeConfig } from "vitest/config";

import defaultConfig from "../../config/vitest.config";

const config = mergeConfig(
	defaultConfig,
	defineConfig({
		test: {
			// Include the generated tests directory
			include: ["test/**/*.test.ts"],
			// Increase timeout for test loading
			testTimeout: 10000,
			// Enable test reporter for better dashboard experience
			reporters: ["verbose"],
		},
	}),
);

export default config;
