import { defineConfig, mergeConfig } from "vitest/config";

import defaultConfig from "../../config/vitest.config";

const config = mergeConfig(
	defaultConfig,
	defineConfig({
		test: {
			disableConsoleIntercept: true,
			environment: "node",
			globals: true,
		},
	}),
);

export default config;
