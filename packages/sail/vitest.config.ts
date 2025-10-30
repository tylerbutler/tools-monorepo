import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["test/**/*.test.ts"],
		exclude: ["node_modules", "esm"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: ["coverage/**", "dist/**", "esm/**", "*.config.*", "test/**"],
		},
	},
	resolve: {
		alias: {
			"@": "/src",
		},
	},
});
