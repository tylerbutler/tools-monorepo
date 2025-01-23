import { rm } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { runCommand } from "@oclif/test";
import { expect } from "chai";
import {
	after as afterAll,
	afterEach,
	before as beforeAll,
	beforeEach,
	describe,
	it,
} from "mocha";
import handler from "serve-handler";
import { temporaryDirectory } from "tempy";

import jsonfile from "jsonfile";
const { readFile: readJson } = jsonfile;

import { testDataPath, testUrls } from "../common.js";

describe("download command", async () => {
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

	let downloadDir: string;
	beforeEach(() => {
		downloadDir = temporaryDirectory();
	});

	afterEach(async () => {
		await rm(downloadDir, { recursive: true });
	});

	afterAll(() => {
		server.close();
	});

	it("downloads json", async () => {
		const { stdout } = await runCommand(
			[
				// This is a single-command CLI, so use "." as the command entrypont per the oclif docs
				".",
				// "download",
				testUrls[0].toString(),
				// `--filename ${outputPath}`,
				`--out ${downloadDir}`,
			],
			{
				root: import.meta.url,
			},
		);

		expect(stdout).to.contain("Downloading ");

		const outputPath = path.join(downloadDir, "test0.json");
		const actual = await readJson(outputPath);
		expect(actual).to.deep.equal({
			key1: 1,
			key2: {
				nested: "object",
			},
		});
	});
});
