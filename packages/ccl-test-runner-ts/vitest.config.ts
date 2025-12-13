import { defineConfig, mergeConfig } from "vitest/config";

import defaultConfig from "../../config/vitest.config";
import SkipSummaryReporter from "./test/skip-summary-reporter.js";

const config = mergeConfig(
	defaultConfig,
	defineConfig({
		test: {
			// Include the generated tests directory
			include: ["test/**/*.test.ts"],
			// Increase timeout for test loading
			testTimeout: 10000,
			// Enable test reporters: verbose for standard output, skip-summary for categorized skip reasons
			reporters: ["verbose", new SkipSummaryReporter()],
		},
	}),
);

export default config;
