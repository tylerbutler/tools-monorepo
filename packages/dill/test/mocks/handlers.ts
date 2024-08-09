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
		return new HttpResponse(file);
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
