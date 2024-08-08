import path from "node:path";
import { readJson, readdir } from "fs-extra";
import { withDir } from "tmp-promise";
import { beforeEach, describe, expect, it, vi } from "vitest";
// import { ufs } from "unionfs";
import { vol } from "memfs";

import { download, extractTarball, fetchFile } from "../src/api.js";
import { getTestUrls } from "./common.js";

// tell vitest to use fs mock from __mocks__ folder
// this can be done in a setup file if fs should always be mocked
vi.mock("node:fs");
vi.mock("node:fs/promises");

// ufs.use(fs).use(vol);

beforeEach(() => {
	// reset the state of in-memory fs
	vol.reset();
	vol.fromJSON(testFsSnapshot);
});

describe("download", () => {
	const testUrls = getTestUrls("http://localhost:8080");

	it("JSON, no arguments", async () => {
		const { data } = await download(testUrls[0], { noFile: true });
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

const testUrls = getTestUrls("file://").map(toString);
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
