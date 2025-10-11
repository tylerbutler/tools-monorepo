import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, fetch }) => {
	const testName = decodeURIComponent(params.name || "");

	try {
		// Load test data directly in the load function to avoid lifecycle issues
		const categoriesResponse = await fetch("/data/categories.json");
		if (!categoriesResponse.ok) {
			return {
				testName,
				test: null,
				error: `Failed to load categories: ${categoriesResponse.status}`,
				categories: [],
			};
		}

		const categories = await categoriesResponse.json();

		// Find the test by name from loaded categories
		const foundTest = categories
			.flatMap((cat: { tests: unknown[] }) => cat.tests)
			.find((t: { name: string }) => t.name === testName);

		if (foundTest) {
			return {
				testName,
				test: foundTest,
				error: null,
				categories,
			};
		}
		// No test found
		if (categories.length === 0) {
			return {
				testName,
				test: null,
				error: "No test data available. Please ensure static data is built.",
				categories: [],
			};
		}
		return {
			testName,
			test: null,
			error: `Test "${testName}" not found in the available data.`,
			categories,
		};
	} catch (_err) {
		return {
			testName,
			test: null,
			error:
				"Failed to load test data. Please check if the static data files are available.",
			categories: [],
		};
	}
};
