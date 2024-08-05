import path from "node:path";
import { readJson, readdir } from "fs-extra";
import { withDir } from "tmp-promise";
import { describe, expect, it } from "vitest";

import { download, extractTarball, fetchFile } from "../../src/api.js";

const testUrls = [
	"http://localhost:8080/test0.json",
	"http://localhost:8080/test1.json",
	"http://localhost:8080/tarball2.tar.gz",
	"http://localhost:8080/tarball3.tar",
] as const;

describe("download", () => {
	it("JSON, no arguments", async () => {
		const { data } = await download(testUrls[0], { noFile: true });
		expect(data).not.toMatchSnapshot();
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
