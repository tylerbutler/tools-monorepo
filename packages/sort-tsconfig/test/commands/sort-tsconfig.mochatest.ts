import path from "node:path";
import { runCommand } from "@oclif/test";
import { expect } from "chai";
import { describe, it } from "mocha";

const testDataPath = "test/data";

const testFiles = {
	config: path.resolve(path.join(testDataPath, "../sort-tsconfig.config.ts")),
	noExist: path.resolve(path.join(testDataPath, "tsconfig.json")),
	sorted: path.resolve(path.join(testDataPath, "tsconfig.sorted.json")),
	unsorted: path.resolve(path.join(testDataPath, "tsconfig.unsorted.json")),
	unsortedUnknownKeys: path.resolve(
		path.join(testDataPath, "tsconfig.unsorted.unknown-keys.json"),
	),
	sortedDir: path.resolve(path.join(testDataPath, "sorted-directory")),
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
		console.debug(testFiles.config);
		const { error } = await runCommand(
			[".", testFiles.unsorted, `--config ${testFiles.config}`],
			{
				root: import.meta.url,
			},
		);
		expect(error?.message).to.equal("Found 1 unsorted files.");
		expect(error?.oclif?.exit).to.equal(1);
	});

	it("detects sorted file", async () => {
		const { error, stdout } = await runCommand(
			[".", `--config ${testFiles.config}`, testFiles.sorted],
			{
				root: import.meta.url,
			},
		);
		expect(stdout.trim()).to.equal("All files sorted.");
		expect(error?.oclif?.exit).to.equal(undefined);
	});

	describe("globs", () => {
		it("detects unsorted", async () => {
			const { error, stdout } = await runCommand(
				[
					".",
					`--config ${testFiles.config}`,
					path.join(testFiles.unsortedDir, "**"),
				],
				{
					root: import.meta.url,
				},
			);
			expect(stdout).to.contain("ERROR: Not sorted!");
			expect(error?.oclif?.exit).to.equal(1);
			expect(error?.message).to.equal("Found 2 unsorted files.");
		});

		it("detects sorted", async () => {
			const testP = path.join(testFiles.sortedDir, "**");
			const { error, stdout } = await runCommand(
				[".", `--config ${testFiles.config}`, testP],
				{
					root: import.meta.url,
				},
			);
			expect(stdout.trim()).to.equal("All files sorted.");
			expect(error?.oclif?.exit).to.equal(undefined);
		});
	});
});
