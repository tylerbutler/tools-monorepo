import { sveltekit } from "@sveltejs/kit/vite";
import Sonda from "sonda/vite";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig({
	plugins: [
		sveltekit(),
		Sonda({
			// Generate bundle analysis report
			open: false, // Don't auto-open in CI
			filename: ".sonda/index.html",
		}),
		devtoolsJson(),
	],
	build: {
		// Required for Sonda to analyze bundles accurately
		sourcemap: true,
		// Performance optimization for production
		target: "esnext",
		minify: "esbuild",
		// Optimize chunk size for better loading
		chunkSizeWarningLimit: 1000,
	}, // Let SvelteKit handle bundle optimization
	// Development optimizations
	server: {
		fs: {
			// Allow serving files from workspace root
			allow: ["../../.."],
		},
		host: true,
	},
	// CSS optimizations
	css: { devSourcemap: true },
	// Performance optimizations
	optimizeDeps: {
		include: ["lucide-svelte", "chart.js", "prismjs"],
	},
});
