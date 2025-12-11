import { readdir, readFile } from "node:fs/promises";
import http from "node:http";
import { getRandomPort } from "get-port-please";
import jsonfile from "jsonfile";
import path from "pathe";
import handler from "serve-handler";
import { withDir } from "tmp-promise";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const { readFile: readJson } = jsonfile;

import process from "node:process";
import { decompressTarball, fetchFile, writeTarFiles } from "../src/api.js";
import { download } from "../src/index.js";
import { getTestUrls, testDataPath } from "./common.js";

/**
 * Test file mappings:
 * - testUrls[0] → test0.json
 * - testUrls[1] → test1.json
 * - testUrls[2] → tarball2.tar.gz
 * - testUrls[3] → tarball3.tar
 * - testUrls[4] → test4.zip
 * - testUrls[5] → test5.json.gz
 */
const testFiles = {
	json0: "test0.json",
	json1: "test1.json",
	tarballGz: "tarball2.tar.gz",
	tarball: "tarball3.tar",
	zip: "test4.zip",
	jsonGz: "test5.json.gz",
};

/** Expected JSON content for test0.json and test1.json */
const expectedJsonContent = {
	key1: 1,
	key2: {
		nested: "object",
	},
};

/** Helper to read a test data file as a Buffer */
async function readTestFile(filename: string): Promise<Buffer> {
	return readFile(path.join(testDataPath, filename));
}

let testUrls: URL[];

describe("download serverless tests", () => {
	beforeAll(async () => {
		const port = await getRandomPort();
		testUrls = getTestUrls(port);
	});

	it("throws when downloadDir doesn't exist", async () => {
		// const filename = "test-dill-dl-1.json";
		// The path won't be written to
		// const downloadPath = path.join(testDataPath, "test-dill-dl-1.json");

		await expect(async () => {
			await download(testUrls[0], {
				downloadDir: "mock-path",
			});
		}).rejects.toThrow();
	});

	it("throws when downloadDir is an existing file, extract === true", async () => {
		await expect(async () => {
			await download(testUrls[0], {
				extract: true,
				downloadDir: path.join(testDataPath, "test0.json"),
			});
		}).rejects.toThrow("Path is not a directory");
	});

	it("fetch fails when downloadDir is an existing file, extract === false", async () => {
		await expect(async () => {
			await download(testUrls[0], {
				extract: false,
				downloadDir: path.join(testDataPath, "test0.json"),
			});
		}).rejects.toThrow("fetch failed");
	});
});

describe("download file: URLs", () => {
	it("throws when can't find file type from buffer", async () => {
		const testUrl = `file://${path.join(testDataPath, "test0.json")}`;
		await expect(async () => {
			await download(testUrl, { noFile: true });
		}).rejects.toThrow("Can't find file type for URL");
	});

	it("detects file type from buffer", async () => {
		const testUrl = `file://${path.join(testDataPath, testFiles.tarballGz)}`;
		const { data } = await download(testUrl, { noFile: true, extract: true });

		// Verify downloaded bytes match the source file exactly
		const expected = await readTestFile(testFiles.tarballGz);
		expect(Buffer.from(data)).toEqual(expected);
	});
});

describe("with local server", () => {
	const server = http.createServer((request, response) => {
		// You pass two more arguments for config and middleware
		// More details here: https://github.com/vercel/serve-handler#options
		return handler(request, response, { public: testDataPath });
	});
	let port: number;

	beforeAll(async () => {
		port = await getRandomPort();
		testUrls = getTestUrls(port);
		server.listen(port);
	});

	afterAll(() => {
		server.close();
	});

	describe("download", () => {
		it("JSON, no arguments", async () => {
			const { data } = await download(testUrls[0], { noFile: true });

			// Verify downloaded bytes match source file exactly
			const expected = await readTestFile(testFiles.json0);
			expect(Buffer.from(data)).toEqual(expected);
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

					// Verify downloaded bytes match source file exactly
					const expected = await readTestFile(testFiles.json0);
					expect(Buffer.from(data)).toEqual(expected);

					// Verify written file content
					const dl = await readJson(downloadPath);
					expect(dl).toEqual(expectedJsonContent);
				},
				{
					// unsafeCleanup ensures the cleanup doesn't fail if there are files in the directory
					unsafeCleanup: true,
				},
			);
		});

		it("JSON, downloadPath = directory", async () => {
			await withDir(
				async ({ path: downloadDir }) => {
					const { data } = await download(testUrls[1], { downloadDir });

					// Verify downloaded bytes match source file exactly
					const expected = await readTestFile(testFiles.json1);
					expect(Buffer.from(data)).toEqual(expected);

					// Verify written file content
					const expectedPath = path.join(downloadDir, "test1.json");
					const dl = await readJson(expectedPath);
					expect(dl).toEqual(expectedJsonContent);
				},
				{
					// unsafeCleanup ensures the cleanup doesn't fail if there are files in the directory
					unsafeCleanup: true,
				},
			);
		});

		it("compressed single JSON file, with extract", async () => {
			await withDir(
				async ({ path: downloadDir }) => {
					const { data } = await download(testUrls[5], {
						downloadDir,
						extract: true,
					});

					// Verify downloaded bytes match source file exactly
					const expected = await readTestFile(testFiles.jsonGz);
					expect(Buffer.from(data)).toEqual(expected);

					// Verify extraction produced expected files
					const files = await readdir(downloadDir, { recursive: true });
					expect(files).toEqual(["test5.json"]);
				},
				{
					// unsafeCleanup ensures the cleanup doesn't fail if there are files in the directory
					unsafeCleanup: true,
				},
			);
		});

		it("compressed tarball, no extract (default)", async () => {
			const { data } = await download(testUrls[2], { noFile: true });

			// Verify downloaded bytes match source file exactly
			const expected = await readTestFile(testFiles.tarballGz);
			expect(Buffer.from(data)).toEqual(expected);
		});

		it("compressed tarball, with extract", async () => {
			await withDir(
				async ({ path: downloadDir }) => {
					const { data } = await download(testUrls[2], {
						downloadDir,
						extract: true,
					});

					// Verify downloaded bytes match source file exactly
					const expected = await readTestFile(testFiles.tarballGz);
					expect(Buffer.from(data)).toEqual(expected);

					// Verify extraction produced expected files
					const files = await readdir(downloadDir, { recursive: true });
					expect(files).toEqual([
						"test",
						"test/data",
						"test/data/test1.json",
						"test/data/test2.json",
					]);
				},
				{
					// unsafeCleanup ensures the cleanup doesn't fail if there are files in the directory
					unsafeCleanup: true,
				},
			);
		});

		it("compressed tarball, with extract and strip=1", async () => {
			await withDir(
				async ({ path: downloadDir }) => {
					const { data } = await download(testUrls[2], {
						downloadDir,
						extract: true,
						strip: 1,
					});

					// Verify downloaded bytes match source file exactly
					const expected = await readTestFile(testFiles.tarballGz);
					expect(Buffer.from(data)).toEqual(expected);

					// Verify extraction with strip=1 produced expected files
					const files = await readdir(downloadDir, { recursive: true });
					expect(files).toEqual(["data", "data/test1.json", "data/test2.json"]);
				},
				{
					unsafeCleanup: true,
				},
			);
		});

		it("compressed tarball, with extract and strip=2", async () => {
			await withDir(
				async ({ path: downloadDir }) => {
					const { data } = await download(testUrls[2], {
						downloadDir,
						extract: true,
						strip: 2,
					});

					// Verify downloaded bytes match source file exactly
					const expected = await readTestFile(testFiles.tarballGz);
					expect(Buffer.from(data)).toEqual(expected);

					// Verify extraction with strip=2 produced expected files
					const files = await readdir(downloadDir, { recursive: true });
					expect(files).toEqual(["test1.json", "test2.json"]);
				},
				{
					unsafeCleanup: true,
				},
			);
		});

		describe("zip file", () => {
			it("no extract (default)", async () => {
				const { data } = await download(testUrls[4], { noFile: true });

				// Verify downloaded bytes match source file exactly
				const expected = await readTestFile(testFiles.zip);
				expect(Buffer.from(data)).toEqual(expected);
			});

			it("with extract", async () => {
				await withDir(
					async ({ path: downloadDir }) => {
						const { data } = await download(testUrls[4], {
							downloadDir,
							extract: true,
						});

						// Verify downloaded bytes match source file exactly
						const expected = await readTestFile(testFiles.zip);
						expect(Buffer.from(data)).toEqual(expected);

						// Verify extraction produced expected files
						const files = await readdir(downloadDir, { recursive: true });
						expect(files).toEqual([
							"test",
							"test/data",
							"test/data/test1.json",
							"test/data/test2.json",
						]);
					},
					{
						// unsafeCleanup ensures the cleanup doesn't fail if there are files in the directory
						unsafeCleanup: true,
					},
				);
			});

			it("with extract and strip=1", async () => {
				await withDir(
					async ({ path: downloadDir }) => {
						const { data } = await download(testUrls[4], {
							downloadDir,
							extract: true,
							strip: 1,
						});

						// Verify downloaded bytes match source file exactly
						const expected = await readTestFile(testFiles.zip);
						expect(Buffer.from(data)).toEqual(expected);

						// Verify extraction with strip=1 produced expected files
						const files = await readdir(downloadDir, { recursive: true });
						expect(files).toEqual([
							"data",
							"data/test1.json",
							"data/test2.json",
						]);
					},
					{
						unsafeCleanup: true,
					},
				);
			});

			it("with extract and strip=2", async () => {
				await withDir(
					async ({ path: downloadDir }) => {
						const { data } = await download(testUrls[4], {
							downloadDir,
							extract: true,
							strip: 2,
						});

						// Verify downloaded bytes match source file exactly
						const expected = await readTestFile(testFiles.zip);
						expect(Buffer.from(data)).toEqual(expected);

						// Verify extraction with strip=2 produced expected files
						const files = await readdir(downloadDir, { recursive: true });
						expect(files).toEqual(["test1.json", "test2.json"]);
					},
					{
						unsafeCleanup: true,
					},
				);
			});
		});
	});

	describe("fetchFile", () => {
		it("fetches file", async () => {
			const { contents } = await fetchFile(testUrls[2]);

			// Verify fetched bytes match source file exactly
			const expected = await readTestFile(testFiles.tarballGz);
			expect(Buffer.from(contents)).toEqual(expected);
		});
	});

	describe("decompressTarball", () => {
		it("decompresses", async () => {
			const { contents } = await fetchFile(testUrls[2]);
			const result = await decompressTarball(contents);

			// Verify structural properties of decompressed tarball
			expect(result).toHaveLength(2);

			// Verify first file
			expect(result[0]).toMatchObject({
				name: expect.stringContaining("test1.json"),
				type: "file",
				size: 51,
			});
			expect(result[0].text).toContain('"key1": 1');
			expect(result[0].text).toContain('"nested": "object"');

			// Verify second file
			expect(result[1]).toMatchObject({
				name: expect.stringContaining("test2.json"),
				type: "file",
				size: 51,
			});
			expect(result[1].text).toContain('"key1": 1');
			expect(result[1].text).toContain('"nested": "object"');
		});

		it("throws when file is not a tarball", async () => {
			const { contents } = await fetchFile(testUrls[0]);
			await expect(async () => {
				await decompressTarball(contents);
			}).rejects.toThrow("Couldn't identify a file type");
		});
	});

	describe("writeTarFiles", () => {
		// it("throws on zip file", async () => {
		// 	const { contents } = await fetchFile(testUrls[4]);
		// 	await expect(async () => {
		// 		await extractTarball(contents, testDataPath);
		// 	}).rejects.toThrow("Unsupported filetype: zip.");
		// });

		it("throws when destination is an existing file", async () => {
			const testFilePath = path.join(testDataPath, "test0.json");
			const { contents } = await fetchFile(testUrls[2]);
			const files = await decompressTarball(contents);

			await expect(async () => {
				await writeTarFiles(files, testFilePath);
			}).rejects.toThrow("Destination path is a file that already exists");
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

	it("JSON, downloadPath = file, ignores Content-Disposition", async () => {
		await withDir(
			async ({ path: downloadDir }) => {
				const url = new URL("http://localhost/tests/content-disposition");
				const filename = "test-dill-dl-1.json";
				const downloadPath = path.join(downloadDir, filename);
				const { data } = await download(url, {
					filename: downloadPath,
				});

				// Mock server returns test0.json content - verify bytes match
				const expected = await readTestFile(testFiles.json0);
				expect(Buffer.from(data)).toEqual(expected);

				// Verify written file content
				const dl = await readJson(downloadPath);
				expect(dl).toEqual(expectedJsonContent);
			},
			{
				// unsafeCleanup ensures the cleanup doesn't fail if there are files in the directory
				unsafeCleanup: true,
			},
		);
	});

	it("JSON, downloadPath = file, current working dir", async () => {
		// const startingDir = process.cwd();
		await withDir(
			async ({ path: downloadDir }) => {
				process.chdir(downloadDir);
				const url = new URL("http://localhost/tests/content-disposition");
				const filename = "test-dill-dl-1.json";
				const downloadPath = path.join(downloadDir, filename);
				const { data } = await download(url, {
					filename,
				});

				// Mock server returns test0.json content - verify bytes match
				const expected = await readTestFile(testFiles.json0);
				expect(Buffer.from(data)).toEqual(expected);

				// Verify written file content
				const dl = await readJson(downloadPath);
				expect(dl).toEqual(expectedJsonContent);
			},
			{
				// unsafeCleanup ensures the cleanup doesn't fail if there are files in the directory
				unsafeCleanup: true,
			},
		);
	});

	it("throws when mime type can't be found", async () => {
		const filename = "test-dill-dl-1.json";
		const downloadDir = path.join(testDataPath, "test-dill-dl-1.json");
		await expect(async () => {
			await download(testUrls[0], {
				downloadDir,
				filename,
			});
		}).rejects.toThrow();
	});

	it("downloads with custom headers", async () => {
		await withDir(
			async ({ path: downloadDir }) => {
				const url = new URL("http://localhost/tests/custom-headers");
				const filename = "test-with-headers.json";
				const downloadPath = path.join(downloadDir, filename);
				const { data } = await download(url, {
					filename: downloadPath,
					headers: {
						Authorization: "Bearer test-token",
						"X-Custom-Header": "test-value",
					},
				});

				// Mock server returns test0.json content - verify bytes match
				const expected = await readTestFile(testFiles.json0);
				expect(Buffer.from(data)).toEqual(expected);

				// Verify written file content
				const dl = await readJson(downloadPath);
				expect(dl).toEqual(expectedJsonContent);
			},
			{
				unsafeCleanup: true,
			},
		);
	});

	it("fails with missing custom headers", async () => {
		const url = new URL("http://localhost/tests/custom-headers");
		await expect(async () => {
			await download(url, {
				noFile: true,
			});
		}).rejects.toThrow();
	});
});
