import { rm } from "node:fs/promises";
import http from "node:http";
import { runCommand } from "@oclif/test";
import { getRandomPort } from "get-port-please";
import path from "pathe";
import handler from "serve-handler";
import { temporaryDirectory } from "tempy";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "vitest";

import jsonfile from "jsonfile";
const { readFile: readJson } = jsonfile;

import { getTestUrls, testDataPath } from "../common.js";

describe("download command", async () => {
	const server = http.createServer((request, response) => {
		// You pass two more arguments for config and middleware
		// More details here: https://github.com/vercel/serve-handler#options
		return handler(request, response, { public: testDataPath });
	});
	let port: number;
	let testUrls: URL[];

	beforeAll(async () => {
		port = await getRandomPort();
		testUrls = getTestUrls(port);
		server.listen(port, () => {
			console.debug(`Running at http://localhost:${port}`);
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
