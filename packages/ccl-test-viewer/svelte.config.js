import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// Detect build environment
const isTauriBuild =
	process.env.TAURI_BUILD === "true" || process.env.BUILD_TARGET === "tauri";
const isNetlifyBuild =
	process.env.NETLIFY === "true" || process.env.BUILD_TARGET === "netlify";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Path aliases for shadcn-svelte compatibility
		alias: {
			"@/*": "./src/lib/*",
		},
		// Adapter configuration based on build target
		adapter: adapter({
			// Output directory - different for Tauri vs Netlify
			pages: isTauriBuild ? "dist" : "build",
			assets: isTauriBuild ? "dist" : "build",
			fallback: "index.html", // SPA fallback for client-side routing
			precompress: !isTauriBuild, // Compress for web, not for Tauri
			strict: true,
		}),
		// Service worker configuration
		serviceWorker: {
			register: false, // Disabled for both targets currently
		},
		// Environment-specific configurations
		env: {
			publicPrefix: "PUBLIC_",
		},
		// CSP configuration for Tauri
		csp: isTauriBuild
			? {
					mode: "hash",
					directives: {
						"script-src": ["self", "unsafe-inline"],
						"style-src": ["self", "unsafe-inline"],
						"img-src": ["self", "data:", "https:"],
						"font-src": ["self", "data:"],
						"connect-src": ["self", "https:", "tauri:"],
					},
				}
			: undefined,
		// Prerender configuration
		prerender: {
			handleHttpError: ({ path, referrer, message }) => {
				// Ignore common 404s in production builds
				if (path === "/favicon.ico" || path.startsWith("/apple-touch-icon")) {
					return;
				}
				// Let other errors fail the build
				throw new Error(message);
			},
		},
	},
	// Tauri-specific optimizations
	compilerOptions: {
		dev: !isTauriBuild,
	},
};

export default config;
