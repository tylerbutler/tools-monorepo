import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
		exclude: ["tests/**/*", "e2e/**/*"],
		environment: "jsdom",
		setupFiles: ["src/test/setup.ts"],
		coverage: {
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"src/test/",
				"**/*.d.ts",
				"**/*.config.*",
				"build/",
				".svelte-kit/",
				"static/",
				"scripts/",
			],
			thresholds: {
				global: {
					branches: 80,
					functions: 80,
					lines: 80,
					statements: 80,
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
