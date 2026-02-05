import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		outDir: "dist",
		sourcemap: true,
	},
	optimizeDeps: {
		// Exclude workspace dependencies from pre-bundling to use latest source
		exclude: ["@tylerbu/levee-client", "@tylerbu/levee-driver"],
		// Force re-bundling on every server start
		force: true,
	},
	resolve: {
		alias: {
			// Point to compiled ESM output directly to bypass any caching
			"@tylerbu/levee-driver": resolve(
				__dirname,
				"../levee-driver/esm/index.js",
			),
			"@tylerbu/levee-client": resolve(
				__dirname,
				"../levee-client/esm/index.js",
			),
		},
	},
	server: {
		port: 3000,
		open: true,
		proxy: {
			// Proxy API requests to Levee server to avoid CORS issues
			"/documents": {
				target: "http://localhost:4000",
				changeOrigin: true,
			},
			"/deltas": {
				target: "http://localhost:4000",
				changeOrigin: true,
			},
			"/repos": {
				target: "http://localhost:4000",
				changeOrigin: true,
			},
			"/socket": {
				target: "ws://localhost:4000",
				ws: true,
			},
		},
	},
});
