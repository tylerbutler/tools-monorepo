import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

export const handlers = [
	// GitHub API - list repository contents (successful response)
	http.get(
		"https://api.github.com/repos/:owner/:repo/contents/*",
		({ params }) => {
			const { owner } = params;

			// Default successful response with test JSON files
			if (owner !== "notfound" && owner !== "private") {
				return HttpResponse.json([
					{
						name: "test.json",
						path: "tests/test.json",
						type: "file",
						size: 1234,
						download_url:
							"https://raw.githubusercontent.com/owner/repo/main/tests/test.json",
						sha: "abc123",
					},
					{
						name: "test2.json",
						path: "tests/test2.json",
						type: "file",
						size: 2345,
						download_url:
							"https://raw.githubusercontent.com/owner/repo/main/tests/test2.json",
						sha: "def456",
					},
					{
						name: "readme.md",
						path: "tests/readme.md",
						type: "file",
						size: 500,
						download_url:
							"https://raw.githubusercontent.com/owner/repo/main/tests/readme.md",
						sha: "ghi789",
					},
					{
						name: "subfolder",
						path: "tests/subfolder",
						type: "dir",
						sha: "jkl012",
					},
				]);
			}

			// 404 for 'notfound' owner
			if (owner === "notfound") {
				return new HttpResponse(
					JSON.stringify({
						message: "Not Found",
						documentation_url:
							"https://docs.github.com/rest/repos/contents#get-repository-content",
					}),
					{ status: 404 },
				);
			}

			// 403 for 'private' owner (rate limit or private repo)
			if (owner === "private") {
				return new HttpResponse(
					JSON.stringify({
						message: "API rate limit exceeded for user ID 12345.",
						documentation_url:
							"https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting",
					}),
					{ status: 403 },
				);
			}
		},
	),

	// Raw GitHub content download (successful JSON response)
	http.get(
		"https://raw.githubusercontent.com/:owner/:repo/:branch/*",
		({ request }) => {
			const url = new URL(request.url);
			const path = url.pathname;

			// Return invalid JSON for files with 'invalid' in the name
			if (path.includes("invalid")) {
				return HttpResponse.text("{ invalid json content }");
			}

			// Default valid CCL test JSON response
			return HttpResponse.json({
				$schema: "1.0",
				tests: [
					{
						name: "test-basic",
						inputs: ["key = value"],
						expected: { count: 1 },
					},
					{
						name: "test-complex",
						inputs: ["key1 = value1\nkey2 = value2"],
						expected: { count: 2 },
					},
				],
			});
		},
	),
];

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
