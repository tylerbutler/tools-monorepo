import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import Sonda from 'sonda/vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		Sonda({
			// Generate bundle analysis report
			open: false, // Don't auto-open in CI
			filename: '.sonda/index.html'
		})
	],
	build: {
		// Required for Sonda to analyze bundles accurately
		sourcemap: true,
		// Performance optimization for production
		target: 'esnext',
		minify: 'esbuild',
		// Bundle splitting for better caching
		rollupOptions: {
			output: {
				manualChunks: {
					// Separate vendor chunks for better caching
					vendor: ['svelte', '@sveltejs/kit'],
					ui: ['lucide-svelte', 'clsx', 'tailwind-merge'],
					charts: ['chart.js'],
					syntax: ['prismjs']
				}
			}
		}
	}
});