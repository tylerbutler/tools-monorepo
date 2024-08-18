import http from "node:http";
import path from "node:path";
import { readJson, readdir } from "fs-extra";
import handler from "serve-handler";
import { withDir } from "tmp-promise";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { download, extractTarball, fetchFile } from "../src/api.js";
import { testDataPath, testUrls } from "./common.js";

describe("with local server", () => {
	const server = http.createServer((request, response) => {
		// You pass two more arguments for config and middleware
		// More details here: https://github.com/vercel/serve-handler#options
		return handler(request, response, { public: testDataPath });
	});

	beforeAll(() => {
		server.listen(8080, () => {
			console.debug("Running at http://localhost:8080");
		});
	});

	afterAll(() => {
		server.close();
	});

	describe("download", () => {
		it("JSON, no arguments", async () => {
			const { data } = await download(testUrls[0], { noFile: true });
			expect(data).toMatchSnapshot();
		});

		it("JSON, downloadPath = file", async () => {
			await withDir(
				async ({ path: downloadDir }) => {
					const filename = "test-dill-dl-1.json";
					const downloadPath = path.join(downloadDir, "test-dill-dl-1.json");

					const { data } = await download(testUrls[0], {
						downloadDir,
						filename,
					});
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

					const expectedPath = path.join(downloadDir, "test1.json");
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
});

describe("with mock service worker", async () => {
	const { mockServer } = await import("./mocks/node.js");

	beforeAll(() => {
		mockServer.listen({
			onUnhandledRequest: "error",
		});
	});

	//  Close server after all tests
	afterAll(() => {
		mockServer.close();
	});

	// Reset handlers after each test
	afterEach(() => {
		mockServer.resetHandlers();
	});

	it("JSON, downloadPath = file, with Content-Disposition", async () => {
		await withDir(
			async ({ path: downloadDir }) => {
				const url = new URL("http://localhost/tests/content-disposition");
				const filename = "test-dill-dl-1.json";
				const downloadPath = path.join(downloadDir, "test-dill-dl-1.json");
				const { data } = await download(url, {
					downloadDir,
					filename,
				});
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
});
