import process from "node:process";
import { defineConfig, mergeConfig } from "vitest/config";

import defaultConfig from "../../config/vitest.config";

const config = mergeConfig(
	defaultConfig,
	defineConfig({
		test: {
			disableConsoleIntercept: true,
			environment: "node",
			globals: true,
			setupFiles: ["tsx/esm"],
			// Explicitly preserve testTimeout from defaultConfig
			testTimeout: process.env.GITHUB_ACTIONS ? 15000 : 5000,
		},
	}),
);

export default config;
