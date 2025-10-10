import { sveltekit } from "@sveltejs/kit/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
		exclude: ["tests/**/*", "e2e/**/*"],
		environment: "jsdom",
		setupFiles: ["src/test/setup.ts"],
		coverage: {
			reporter: ["text", "json", "html"],
			include: [
				"src/lib/**/*.{ts,js}",
				"!src/lib/**/*.svelte.ts",
			],
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
