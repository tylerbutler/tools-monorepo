import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import Sonda from "sonda/vite";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		Sonda({
			// Generate bundle analysis report
			open: false, // Don't auto-open in CI
			filename: ".sonda/index.html",
		}),
		devtoolsJson(),
	],
	build: {
		// Disable sourcemaps for faster builds in production
		sourcemap: false,
		// Performance optimization for production
		target: "esnext",
		minify: "esbuild",
		// Optimize chunk size for better loading
		chunkSizeWarningLimit: 1000,
		// Faster builds with parallel workers
		rollupOptions: {
			// Let Vite handle chunk optimization automatically
		},
	},
	// Development optimizations
	server: {
		fs: {
			// Allow serving files from workspace root
			allow: ["../../.."],
		},
		host: true,
	},
	// CSS optimizations - disable dev sourcemaps for speed
	css: { devSourcemap: false },
	// Enhanced pre-bundling for faster builds
	optimizeDeps: {
		include: ["clsx", "tailwind-merge", "tailwind-variants"],
		// Force pre-bundling rebuild
		force: false,
	},
});
