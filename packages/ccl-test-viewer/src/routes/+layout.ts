import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = ({ url, params }) => {
	return {
		currentPath: url.pathname,
		params,
	};
};

// Disable prerendering but enable SSR for proper page rendering
export const prerender = false;
export const ssr = true;
