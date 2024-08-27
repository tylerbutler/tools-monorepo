import path from "node:path";
import { runCommand } from "@oclif/test";
import { expect } from "chai";
import { describe, it } from "mocha";

const testDataPath = "test/data";

const testFiles = {
	noExist: path.join(testDataPath, "tsconfig.json"),
	sorted: path.join(testDataPath, "tsconfig.sorted.json"),
	unsorted: path.join(testDataPath, "tsconfig.unsorted.json"),
	unsortedUnknownKeys: path.join(
		testDataPath,
		"tsconfig.unsorted.unknown-keys.json",
	),
	sortedDir: path.join(testDataPath, "sorted-directory"),
	unsortedDir: testDataPath,
};

describe("sort-tsconfig command", () => {
	it("file not found", async () => {
		const { error } = await runCommand([".", testFiles.noExist], {
			root: import.meta.url,
		});
		expect(error?.message).to.equal("No files found matching arguments");
		expect(error?.oclif?.exit).to.equal(2);
	});

	it("detects unsorted file", async () => {
		const { error } = await runCommand([".", testFiles.unsorted], {
			root: import.meta.url,
		});
		expect(error?.message).to.equal("Found 1 unsorted files.");
		expect(error?.oclif?.exit).to.equal(1);
	});

	it("detects sorted file", async () => {
		const { error, stdout } = await runCommand([".", testFiles.sorted], {
			root: import.meta.url,
		});
		expect(stdout).to.equal("");
		expect(error?.oclif?.exit).to.equal(undefined);
	});

	describe("globs", () => {
		it("detects unsorted", async () => {
			const { error, stdout } = await runCommand(
				[".", "--", path.join(testFiles.unsortedDir, "**")],
				{
					root: import.meta.url,
				},
			);
			expect(stdout).to.contain("ERROR: Not sorted!");
			expect(error?.oclif?.exit).to.equal(1);
			expect(error?.message).to.equal("Found 2 unsorted files.");
		});

		it("detects sorted", async () => {
			const { error, stdout } = await runCommand(
				[".", "--", path.join(testFiles.sortedDir, "**")],
				{
					root: import.meta.url,
				},
			);
			expect(stdout).to.equal("");
			expect(error?.oclif?.exit).to.equal(undefined);
		});
	});
});
