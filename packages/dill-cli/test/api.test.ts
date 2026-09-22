import { mkdir, readdir, readFile, symlink, writeFile } from "node:fs/promises";
import http from "node:http";
import { getRandomPort } from "get-port-please";
import jsonfile from "jsonfile";
import path from "pathe";
import handler from "serve-handler";
import { withDir } from "tmp-promise";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const { readFile: readJson } = jsonfile;

import process from "node:process";
import {
	decompressTarball,
	fetchFile,
	writeTarFiles,
	writeZipFiles,
} from "../src/api.js";
import { download } from "../src/index.js";
import { getTestUrls, testDataPath } from "./common.js";

let testUrls: URL[];

const unsafeArchiveEntryNames = [
	"../escape.txt",
	"nested/../../escape.txt",
	"..\\escape.txt",
	"C:\\escape.txt",
	"\\\\server\\share\\escape.txt",
	"/absolute/escape.txt",
];

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
		const testUrl = `file://${path.join(testDataPath, "tarball2.tar.gz")}`;
		const { data } = await download(testUrl, { noFile: true, extract: true });
		expect(data).toMatchSnapshot();
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

		it("compressed single JSON file, with extract", async () => {
			await withDir(
				async ({ path: downloadDir }) => {
					const { data } = await download(testUrls[5], {
						downloadDir,
						extract: true,
					});
					expect(data).toMatchSnapshot();

					const files = await readdir(downloadDir, { recursive: true });
					expect(files).toMatchSnapshot();
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

		describe("zip file", () => {
			it("no extract (default)", async () => {
				const { data } = await download(testUrls[4], { noFile: true });
				expect(data).toMatchSnapshot();
			});

			it("with extract", async () => {
				await withDir(
					async ({ path: downloadDir }) => {
						const { data } = await download(testUrls[4], {
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
		});
	});

	describe("fetchFile", () => {
		it("fetches file", async () => {
			const { contents } = await fetchFile(testUrls[2]);
			expect(contents).toMatchSnapshot();
		});
	});

	describe("decompressTarball", () => {
		it("decompresses", async () => {
			const { contents } = await fetchFile(testUrls[2]);
			const result = await decompressTarball(contents);
			expect(result).toMatchSnapshot();
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

		it.each(
			unsafeArchiveEntryNames,
		)("rejects unsafe archive entry %s before writing", async (entryName) => {
			await withDir(
				async ({ path: temporaryDirectory }) => {
					const destination = path.join(temporaryDirectory, "extract");
					await mkdir(destination);
					const tarFiles = [
						{
							name: entryName,
							data: new Uint8Array([1]),
						},
					] as Parameters<typeof writeTarFiles>[0];

					await expect(writeTarFiles(tarFiles, destination)).rejects.toThrow(
						`Unsafe archive entry path: ${entryName}`,
					);
					expect(await readdir(temporaryDirectory)).toEqual(["extract"]);
				},
				{ unsafeCleanup: true },
			);
		});

		it("validates every archive entry before writing tar files", async () => {
			await withDir(
				async ({ path: temporaryDirectory }) => {
					const destination = path.join(temporaryDirectory, "extract");
					await mkdir(destination);
					const tarFiles = [
						{ name: "safe.txt", data: new Uint8Array([1]) },
						{ name: "../escape.txt", data: new Uint8Array([1]) },
					] as Parameters<typeof writeTarFiles>[0];

					await expect(writeTarFiles(tarFiles, destination)).rejects.toThrow(
						"Unsafe archive entry path: ../escape.txt",
					);
					expect(await readdir(destination)).toEqual([]);
				},
				{ unsafeCleanup: true },
			);
		});

		it.each([
			"tar",
			"zip",
		] as const)("rejects a symlinked parent before writing %s files", async (archiveType) => {
			await withDir(
				async ({ path: temporaryDirectory }) => {
					const destination = path.join(temporaryDirectory, "extract");
					const outside = path.join(temporaryDirectory, "outside");
					await mkdir(destination);
					await mkdir(outside);
					await symlink(
						outside,
						path.join(destination, "link"),
						process.platform === "win32" ? "junction" : "dir",
					);

					const write =
						archiveType === "tar"
							? writeTarFiles(
									[
										{
											name: "link/pwned",
											data: new Uint8Array([1]),
										},
									] as Parameters<typeof writeTarFiles>[0],
									destination,
								)
							: writeZipFiles(
									{ "link/pwned": new Uint8Array([1]) },
									destination,
								);

					await expect(write).rejects.toThrow(
						"Unsafe archive entry path: link/pwned",
					);
					expect(await readdir(outside)).toEqual([]);
				},
				{ unsafeCleanup: true },
			);
		});

		it.skipIf(process.platform === "win32")(
			"does not follow a symlink at the final output path",
			async () => {
				await withDir(
					async ({ path: temporaryDirectory }) => {
						const destination = path.join(temporaryDirectory, "extract");
						const protectedFile = path.join(
							temporaryDirectory,
							"protected.txt",
						);
						await mkdir(destination);
						await writeFile(protectedFile, "safe");
						await symlink(
							protectedFile,
							path.join(destination, "pwned"),
							"file",
						);

						await expect(
							writeTarFiles(
								[{ name: "pwned", data: new Uint8Array([1]) }] as Parameters<
									typeof writeTarFiles
								>[0],
								destination,
							),
						).rejects.toThrow("Unsafe archive entry path: pwned");
						expect(await readFile(protectedFile, "utf8")).toBe("safe");
					},
					{ unsafeCleanup: true },
				);
			},
		);
	});

	describe("writeZipFiles", () => {
		it.each(
			unsafeArchiveEntryNames,
		)("rejects unsafe archive entry %s before writing", async (entryName) => {
			await withDir(
				async ({ path: temporaryDirectory }) => {
					const destination = path.join(temporaryDirectory, "extract");
					await mkdir(destination);

					await expect(
						writeZipFiles({ [entryName]: new Uint8Array([1]) }, destination),
					).rejects.toThrow(`Unsafe archive entry path: ${entryName}`);
					expect(await readdir(temporaryDirectory)).toEqual(["extract"]);
				},
				{ unsafeCleanup: true },
			);
		});

		it("validates every archive entry before writing zip files", async () => {
			await withDir(
				async ({ path: temporaryDirectory }) => {
					const destination = path.join(temporaryDirectory, "extract");
					await mkdir(destination);

					await expect(
						writeZipFiles(
							{
								"safe.txt": new Uint8Array([1]),
								"../escape.txt": new Uint8Array([1]),
							},
							destination,
						),
					).rejects.toThrow("Unsafe archive entry path: ../escape.txt");
					expect(await readdir(destination)).toEqual([]);
				},
				{ unsafeCleanup: true },
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

	it("JSON, downloadPath = file, ignores Content-Disposition", async () => {
		await withDir(
			async ({ path: downloadDir }) => {
				const url = new URL("http://localhost/tests/content-disposition");
				const filename = "test-dill-dl-1.json";
				const downloadPath = path.join(downloadDir, filename);
				const { data } = await download(url, {
					filename: downloadPath,
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
});
