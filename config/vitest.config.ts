import process from "node:process";
import { defineConfig } from "vitest/config";

const config = defineConfig({
	test: {
		// Explicitly disable watch mode to prevent interactive TUI
		watch: false,
		// CI environments are slower, so increase timeout to prevent flaky test failures
		testTimeout: process.env.GITHUB_ACTIONS ? 15_000 : 5000,
		reporters: process.env.GITHUB_ACTIONS
			? // CI mode
				["github-actions", "junit"]
			: // local mode
				["verbose", "junit"],
		outputFile: {
			junit: "./_temp/junit.xml",
		},
		coverage: {
			include: ["src/**"],
			provider: "v8",
			reporter: ["text", "json", "html"],
			reportsDirectory: ".coverage/vitest",
		},
		exclude: [
			// Default Vitest exclusions
			"**/node_modules/**",
			"**/dist/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",

			// Exclude test fixtures - these are test data, not actual tests
			"**/fixtures/**",
		],
	},
});

// biome-ignore lint/style/noDefaultExport: correct pattern for config files
export default config;
