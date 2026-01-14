import process from "node:process";
import { sveltekit } from "@sveltejs/kit/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
		exclude: ["tests/**/*", "e2e/**/*"],
		environment: "happy-dom",
		setupFiles: ["src/test/setup.ts", "src/test/msw.setup.ts"],
		// CI environments are slower, so increase timeout to prevent flaky test failures
		testTimeout: process.env.GITHUB_ACTIONS ? 15000 : 5000,
		reporters: process.env.GITHUB_ACTIONS
			? // CI mode
				["github-actions", "junit"]
			: // local mode
				["verbose", "junit"],
		outputFile: {
			junit: "./_temp/junit.xml",
		},
		coverage: {
			// Include cobertura for better codecov integration
			reporter: ["text", "json", "html", "cobertura"],
			provider: "v8",
			reportsDirectory: ".coverage/vitest",
			include: ["src/lib/**/*.{ts,js}", "!src/lib/**/*.svelte.ts"],
			exclude: [
				"node_modules/",
				"src/test/",
				"**/*.d.ts",
				"**/*.config.*",
				"build/",
				".svelte-kit/",
				"static/",
				"scripts/",
				"**/*.svelte",
				"src/routes/**/*",
				"tests/e2e/**/*",
				".lighthouserc.js",
				"src/lib/data/types.ts",
				"src/lib/data/function-types.ts",
			],
			thresholds: {
				global: {
					branches: 60,
					functions: 60,
					lines: 60,
					statements: 60,
				},
			},
		},
		globals: true,
		alias: {
			$lib: "./src/lib",
			$app: "./src/app",
		},
	},
});
