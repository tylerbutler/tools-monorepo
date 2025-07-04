import { readFile } from "node:fs/promises";
import { HttpResponse, http } from "msw";
import path from "pathe";

import { testDataPath } from "../common.js";

const fileName = path.join(testDataPath, "test0.json");
const file = await readFile(fileName);

/**
 * HTTP handlers for tests. These handlers are used in a Mock Service Worker instance to respond to requests.
 */
export const testHttpHandlers = [
	http.get("http://localhost/tests/:test", ({ params }) => {
		// All request path params are provided in the "params"
		// argument of the response resolver.
		const { test } = params;
		switch (test) {
			case "content-disposition": {
				return testContentDispositionHeader(file);
			}
			case "content-disposition-undefined": {
				return testContentDispositionHeaderUndefined(file);
			}
			default: {
				throw new Error(`Unknown test case name: ${test}`);
			}
		}
	}),
];

function testContentDispositionHeader(theFile: Buffer): HttpResponse {
	return new HttpResponse(theFile, {
		headers: {
			"Content-Type": "application/json",
			"Content-Disposition": 'inline; filename="remote-filename.json"',
		},
	});
}

function testContentDispositionHeaderUndefined(theFile: Buffer): HttpResponse {
	return new HttpResponse(
		theFile,
		// 	{
		// 	headers: {
		// 		"Content-Type": "application/json",
		// 		"Content-Disposition": 'inline; filename="remote-filename.json"',
		// 	},
		// }
	);
}
