import { defineConfig, mergeConfig } from "vitest/config";

import defaultConfig from "../../config/vitest.config";
import SkipSummaryReporter from "./test/skip-summary-reporter.js";

const config = mergeConfig(
	defaultConfig,
	defineConfig({
		test: {
			// Include the generated tests directory
			include: ["test/**/*.test.ts"],
			// Setup file for custom matchers
			setupFiles: ["./test/vitest-setup.ts"],
			// Increase timeout for test loading
			testTimeout: 10000,
			// Enable test reporters: verbose for standard output, skip-summary for categorized skip reasons
			reporters: ["verbose", new SkipSummaryReporter()],
			coverage: {
				exclude: [
					// CLI tool with network calls - integration-level code
					"**/download.ts",
					// Type definitions only, no runtime logic
					"**/schema-validation.ts",
					// Generated code - types only, no runtime logic
					"**/generated/**",
					// Re-export barrel file
					"**/index.ts",
				],
			},
		},
	}),
);

export default config;
