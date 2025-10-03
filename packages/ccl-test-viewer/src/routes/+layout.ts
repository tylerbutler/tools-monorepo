import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = ({ url, params }) => {
	return {
		currentPath: url.pathname,
		params,
	};
};

// Disable both prerendering and SSR for client-side only app
// This prevents hydration mismatches with Svelte 5 runes
export const prerender = false;
export const ssr = false;
