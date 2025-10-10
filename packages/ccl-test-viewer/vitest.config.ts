import { sveltekit } from "@sveltejs/kit/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";

// Plugin to resolve MSW node imports correctly in test environment
const mswResolverPlugin = (): Plugin => ({
	name: "msw-resolver",
	enforce: "pre",
	async resolveId(id) {
		if (id === "msw/node") {
			// Directly return the path to MSW's node entry point
			const resolved = await this.resolve("msw", undefined, {
				skipSelf: true,
			});
			if (resolved) {
				// Replace lib/core/index with node directory
				const basePath = resolved.id.replace(/\/lib\/core\/[^/]+$/, "");
				return `${basePath}/node`;
			}
		}
	},
});

export default defineConfig({
	plugins: [mswResolverPlugin(), sveltekit(), svelteTesting()],
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
		exclude: ["tests/**/*", "e2e/**/*"],
		environment: "happy-dom",
		setupFiles: ["src/test/setup.ts", "src/test/msw.setup.ts"],
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
