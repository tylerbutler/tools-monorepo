// import { copyFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "@oclif/test";
import { expect } from "chai";
// import { fs as memfs, vol } from "memfs";
import { describe, it } from "mocha";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const testFiles = {
// 	sorted: "data/tsconfig.sorted.json",
// 	unsorted: "data/tsconfig.unsorted.json",
// 	unsortedUnknownKeys: "data/tsconfig.unsorted.unknown-keys.json",
// };

// const json = {
// 	"./tsconfig.sorted.json": "1",
// 	"./tsconfig.unsorted.json": "2",
// 	"./tsconfig.unsorted.unknown-keys.json": "3",
// };

// vol.fromJSON(json, "/app");

// memfs.readFileSync("/app/README.md", "utf8"); // 1
// vol.readFileSync("/app/src/index.js", "utf8"); // 2

describe("sort-tsconfig command", () => {
	it("no files found", async () => {
		const { error } = await runCommand([".", "tsconfig.json"], {
			root: import.meta.url,
		});
		console.debug(error);
		expect(error?.message).to.equal("No files found matching arguments");
		expect(error?.oclif?.exit).to.equal(2);
	});

	// it("detects unsorted", async () => {
	// 	const { error, stdout } = await runCommand([".", testFiles.unsorted], {
	// 		root: import.meta.url,
	// 	});
	// 	expect(stdout).to.equal("");
	// 	expect(error?.oclif?.exit).to.equal(1);
	// });

	// describe("globs", () => {
	// 	it("detects sorted", async () => {
	// 		const { error, stdout } = await runCommand([".", testFiles.unsorted], {
	// 			root: import.meta.url,
	// 		});
	// 		expect(stdout).to.equal("");
	// 		expect(error?.oclif?.exit).to.equal(2);
	// 	});
	// });
});
