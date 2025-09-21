import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Using static adapter for client-side only app
		// This eliminates SSR completely and prevents hydration issues
		adapter: adapter({
			// Output directory for static files
			pages: "build",
			assets: "build",
			fallback: "index.html", // SPA fallback for client-side routing
			precompress: false,
			strict: true,
		}),
		// Disable service worker completely
		serviceWorker: {
			register: false,
		},
	},
};

export default config;
