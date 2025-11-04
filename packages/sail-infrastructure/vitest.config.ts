import { defineConfig, mergeConfig } from "vitest/config";

import defaultConfig from "../../config/vitest.config";

const config = mergeConfig(
	defaultConfig,
	defineConfig({
		test: {
			// Disable file-level parallelism to avoid race conditions on shared test data
			// Tests that modify src/test/data/testRepo must not run concurrently
			fileParallelism: false,
		},
	}),
);

export default config;
