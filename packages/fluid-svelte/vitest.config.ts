import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, mergeConfig } from "vitest/config";

import defaultConfig from "../../config/vitest.config";

const config = mergeConfig(
	defaultConfig,
	defineConfig({
		plugins: [svelte()],
		resolve: {
			conditions: ["browser"],
		},
		test: {
			disableConsoleIntercept: true,
			environment: "node",
			globals: true,
			setupFiles: ["tsx/esm"],
		},
	}),
);

export default config;
