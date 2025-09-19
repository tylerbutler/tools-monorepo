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
		// Optimize chunk size for better loading
		chunkSizeWarningLimit: 1000,
		// Bundle splitting for better caching
		rollupOptions: {
			output: {
				manualChunks: {
					// Separate vendor chunks for better caching
					vendor: ['svelte', '@sveltejs/kit'],
					ui: ['lucide-svelte', 'clsx', 'tailwind-merge'],
					charts: ['chart.js'],
					syntax: ['prismjs']
				},
				// Optimize asset naming for caching
				assetFileNames: (assetInfo) => {
					const extType = assetInfo.name?.split('.').at(1);
					if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType ?? '')) {
						return `assets/images/[name]-[hash][extname]`;
					}
					if (/css/i.test(extType ?? '')) {
						return `assets/css/[name]-[hash][extname]`;
					}
					return `assets/[name]-[hash][extname]`;
				},
				chunkFileNames: 'assets/js/[name]-[hash].js',
				entryFileNames: 'assets/js/[name]-[hash].js'
			}
		}
	},
	// Development optimizations
	server: {
		fs: {
			// Allow serving files from one level up to access workspace packages
			allow: ['..']
		}
	},
	// CSS optimizations
	css: {
		devSourcemap: true
	},
	// Performance optimizations
	optimizeDeps: {
		include: ['lucide-svelte', 'chart.js', 'prismjs']
	}
});