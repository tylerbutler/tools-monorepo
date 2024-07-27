import { copyFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withDir } from "tmp-promise";
import { describe, expect, it } from "vitest";
import { isSorted, sortTsconfigFile } from "../src/tsconfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = {
	sorted: "data/tsconfig.sorted.json",
	unsorted: "data/tsconfig.unsorted.json",
	unsortedUnknownKeys: "data/tsconfig.unsorted.unknown-keys.json",
};

describe("tsconfig", async () => {
	it("detects sorted", () => {
		const testFile = path.join(__dirname, testFiles.sorted);
		const result = isSorted(testFile);
		expect(result).to.be.true;
	});

	it("detects unsorted unknown keys", () => {
		const testFile = path.join(__dirname, testFiles.unsortedUnknownKeys);
		const result = isSorted(testFile);
		expect(result).to.be.false;
	});

	it("detects unsorted", () => {
		const testFile = path.join(__dirname, testFiles.unsorted);
		const result = isSorted(testFile);
		expect(result).to.be.false;
	});

	it("sortTsconfigFile", async () => {
		await withDir(
			async ({ path: tempDir }) => {
				const sourceFile = path.join(__dirname, testFiles.unsorted);
				const testFile = path.join(tempDir, path.basename(testFiles.unsorted));
				await copyFile(sourceFile, testFile);

				const result = sortTsconfigFile(testFile, true);
				expect(result.alreadySorted).to.be.false;
				expect(result).to.matchSnapshot();

				const rewritten = await readFile(testFile, { encoding: "utf8" });
				expect(result.tsconfig).to.equal(rewritten);
			},
			{
				// usafeCleanup ensures the cleanup doesn't fail if there are files in the directory
				unsafeCleanup: true,
			},
		);
	});

	it("sortTsconfigFile with unknown keys", async () => {
		await withDir(
			async ({ path: tempDir }) => {
				const sourceFile = path.join(__dirname, testFiles.unsortedUnknownKeys);
				const testFile = path.join(
					tempDir,
					path.basename(testFiles.unsortedUnknownKeys),
				);
				await copyFile(sourceFile, testFile);

				const result = sortTsconfigFile(testFile, true);
				expect(result.alreadySorted).to.be.false;
				expect(result).to.matchSnapshot();

				const rewritten = await readFile(testFile, { encoding: "utf8" });
				expect(result.tsconfig).to.equal(rewritten);
			},
			{
				// usafeCleanup ensures the cleanup doesn't fail if there are files in the directory
				unsafeCleanup: true,
			},
		);
	});
});
