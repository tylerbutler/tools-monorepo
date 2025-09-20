import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = ({ url, params }) => {
	return {
		currentPath: url.pathname,
		params,
	};
};

// Disable prerendering and SSR to avoid hydration issues
export const prerender = false;
export const ssr = false;
