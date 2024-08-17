import { readFile } from "node:fs/promises";
import path from "node:path";
import { http, HttpResponse } from "msw";
import { assert, beforeEach, describe, expect, it, vi } from "vitest";

import { testDataPath } from "../common";

export const testHttpHandlers = [
	http.get("http://localhost/files/:file/:test", async ({ params }) => {
		// All request path params are provided in the "params"
		// argument of the response resolver.
		const { file: fileName, test } = params;
		assert(typeof fileName === "string");
		assert(typeof test === "string");

		const file = await readFile(path.join(testDataPath, fileName));
		const response = new HttpResponse(file);

		if (test === "content-disposition") {
			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition
			// When both filename and filename* are present in a single header field value, filename* is preferred over
			// filename when both are understood. It's recommended to include both for maximum compatibility
			// response.headers.append(
			// 	"Content-Disposition",
			// 	'inline; filename*="remote-filename.json"',
			// );
			return new HttpResponse(file, {
				headers: {
					// "Content-Type": "application/json",
					"Content-Disposition": 'inline; filename="remote-filename.json"',
				},
			});
		}

		return response;
	}),

	http.get("http://localhost/files/:file", async ({ params }) => {
		// All request path params are provided in the "params"
		// argument of the response resolver.
		const { file: fileName } = params;
		assert(typeof fileName === "string");

		const file = await readFile(path.join(testDataPath, fileName));
		return new HttpResponse(file);
	}),
	http.get("http://localhost/user", () => {
		return HttpResponse.json({
			firstName: "John",
			lastName: "Maverick",
		});
	}),
];
