import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
	// Server-side data loading for SSR compatibility
	if (typeof window === "undefined") {
		// SSR - return minimal data that components can handle
		return {
			ssrMode: true,
		};
	}

	// Client-side - return empty data, components will load via effects
	return {
		ssrMode: false,
	};
};

// Disable prerendering for dynamic data
export const prerender = false;
