import path from "node:path";
import { readJson, readdir } from "fs-extra";
// import { ufs } from "unionfs";
// import { vol } from "memfs";
import { withDir } from "tmp-promise";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
// import { fetch } from "node-fetch";

import { download, extractTarball, fetchFile } from "../src/api.js";
import { getTestUrls, testDataPath } from "./common.js";
import { server } from "./mocks/node.js";

// tell vitest to use fs mock from __mocks__ folder
// this can be done in a setup file if fs should always be mocked
// vi.mock("node:fs");
// vi.mock("node:fs/promises");

// ufs.use(fs).use(vol);

beforeAll(() => {
	server.listen({
		onUnhandledRequest: "error",
	});
});

//  Close server after all tests
afterAll(() => {
	server.close();
});

// Reset handlers after each test
afterEach(() => {
	server.resetHandlers();
});

server.events.on("request:start", ({ request }) => {
	console.debug("MSW intercepted:", request.method, request.url);
});

// beforeEach(() => {
// 	// reset the state of in-memory fs
// 	vol.reset();
// 	vol.fromJSON(testFsSnapshot);
// });

describe("download", () => {
	const testUrls = getTestUrls("http://localhost/files");
	it("JSON, no arguments", async () => {
		const url = testUrls[0];
		const { data } = await download(url, { noFile: true });
		expect(data).toMatchSnapshot();
	});

	it("JSON, downloadPath = file", async () => {
		await withDir(
			async ({ path: downloadDir }) => {
				const filename = "test-dill-dl-1.json";
				const downloadPath = path.join(downloadDir, "test-dill-dl-1.json");
				const { data } = await download(testUrls[0], { downloadDir, filename });
				expect(data).toMatchSnapshot();
				const dl = await readJson(downloadPath);
				expect(dl).toMatchSnapshot();
			},
			{
				// usafeCleanup ensures the cleanup doesn't fail if there are files in the directory
				unsafeCleanup: true,
			},
		);
	});

	it("JSON, downloadPath = file, with Content-Disposition", async () => {
		await withDir(
			async ({ path: downloadDir }) => {
				const url = testUrls[0];
				url.pathname += "/content-disposition";
				const filename = "test-dill-dl-1.json";
				const downloadPath = path.join(downloadDir, "test-dill-dl-1.json");
				const { data } = await download(url, { downloadDir, filename });
				expect(data).toMatchSnapshot();
				const dl = await readJson(downloadPath);
				expect(dl).toMatchSnapshot();
			},
			{
				// usafeCleanup ensures the cleanup doesn't fail if there are files in the directory
				unsafeCleanup: true,
			},
		);
	});

	it("JSON, downloadPath = directory", async () => {
		await withDir(
			async ({ path: downloadDir }) => {
				const { data } = await download(testUrls[1], { downloadDir });
				expect(data).toMatchSnapshot();
				const expectedPath = path.join(downloadDir, "dill-download.json");
				const dl = await readJson(expectedPath);
				expect(dl).toMatchSnapshot();
			},
			{
				// usafeCleanup ensures the cleanup doesn't fail if there are files in the directory
				unsafeCleanup: true,
			},
		);
	});

	it("JSON, downloadPath = directory, with Content-Disposition", async () => {
		await withDir(
			async ({ path: downloadDir }) => {
				const url = testUrls[1];
				url.pathname += "/content-disposition";
				const { data } = await download(url, { downloadDir });
				expect(data).toMatchSnapshot();
				const expectedPath = path.join(downloadDir, "remote-filename.json");
				const dl = await readJson(expectedPath);
				expect(dl).toMatchSnapshot();
			},
			{
				// usafeCleanup ensures the cleanup doesn't fail if there are files in the directory
				unsafeCleanup: true,
			},
		);
	});

	it("compressed tarball, no extract (default)", async () => {
		const { data } = await download(testUrls[2], { noFile: true });
		expect(data).toMatchSnapshot();
	});

	it("compressed tarball, with extract", async () => {
		await withDir(
			async ({ path: downloadDir }) => {
				const { data } = await download(testUrls[2], {
					downloadDir,
					extract: true,
				});
				expect(data).toMatchSnapshot();
				const files = await readdir(downloadDir, { recursive: true });
				expect(files).toMatchSnapshot();
				expect(files).toEqual([
					"test",
					"test/data",
					"test/data/test1.json",
					"test/data/test2.json",
				]);
			},
			{
				// usafeCleanup ensures the cleanup doesn't fail if there are files in the directory
				unsafeCleanup: true,
			},
		);
	});

	it("zip file, no extract (default)", async () => {
		const { data } = await download(testUrls[4], { noFile: true });
		expect(data).toMatchSnapshot();
	});

	it("zip file with extract throws", () => {
		expect(async () => {
			await download(testUrls[4], {
				downloadDir: "./foo",
				extract: true,
			});
		}).rejects.toThrow();
	});
});

const testUrls = getTestUrls(`file://${testDataPath}`).map((u) => u.toString());
describe("fetchFile", () => {
	it("fetches file", async () => {
		const { contents } = await fetchFile(testUrls[2]);
		expect(contents).toMatchSnapshot();
	});
});

describe("extractTarball", () => {
	it("extracts to directory", async () => {
		await withDir(
			async ({ path: downloadDir }) => {
				const { contents } = await fetchFile(testUrls[3]);
				const result = await extractTarball(contents, downloadDir);
				expect(result).toMatchSnapshot();

				const files = await readdir(downloadDir, { recursive: true });
				expect(files).toMatchSnapshot();
			},
			{
				// usafeCleanup ensures the cleanup doesn't fail if there are files in the directory
				unsafeCleanup: true,
			},
		);
	});
});
