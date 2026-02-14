import process from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "pathe";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = defineConfig({
	test: {
		// Create coverage temp directory before tests to prevent race condition
		// where parallel workers try to write before the directory exists
		globalSetup: [resolve(__dirname, "vitest.global-setup.ts")],
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
			exclude: [
				// Non-code files - V8 coverage provider fails to parse them
				"**/*.json",
				"**/*.md",
				"**/*.yaml",
				"**/*.yml",
				// Test fixtures are test data, not source code
				"**/fixtures/**",
				"**/test/data/**",
			],
			provider: "v8",
			// Include cobertura for better codecov integration
			reporter: ["text", "json", "html", "cobertura"],
			reportsDirectory: ".coverage/vitest",
			// Serialize coverage processing to prevent race condition in CI
			// where parallel workers try to write to .tmp directory simultaneously
			processingConcurrency: 1,
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
