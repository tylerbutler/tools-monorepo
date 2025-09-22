import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, fetch }) => {
	const testName = decodeURIComponent(params.name || "");

	try {
		// Load test data directly in the load function to avoid lifecycle issues
		const categoriesResponse = await fetch("/data/categories.json");
		if (!categoriesResponse.ok) {
			console.error(`Failed to load categories: ${categoriesResponse.status}`);
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
			.flatMap((cat: any) => cat.tests)
			.find((t: any) => t.name === testName);

		if (foundTest) {
			console.log(`Load function found test: ${foundTest.name}`);
			return {
				testName,
				test: foundTest,
				error: null,
				categories,
			};
		} else {
			// No test found
			if (categories.length === 0) {
				return {
					testName,
					test: null,
					error: `No test data available. Please ensure static data is built.`,
					categories: [],
				};
			} else {
				console.log(
					`Available tests: ${categories
						.flatMap((cat: any) => cat.tests)
						.map((t: any) => t.name)
						.join(", ")}`,
				);
				return {
					testName,
					test: null,
					error: `Test "${testName}" not found in the available data.`,
					categories,
				};
			}
		}
	} catch (err) {
		console.error("Failed to load data in load function:", err);
		return {
			testName,
			test: null,
			error:
				"Failed to load test data. Please check if the static data files are available.",
			categories: [],
		};
	}
};
