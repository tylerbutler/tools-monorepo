import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params }) => {
	return {
		testName: decodeURIComponent(params.name || ""),
	};
};
