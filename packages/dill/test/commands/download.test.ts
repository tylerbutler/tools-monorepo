import { readdir, rm } from "node:fs/promises";
import http from "node:http";
import { runCommand } from "@oclif/test";
import { getRandomPort } from "get-port-please";
import jsonfile from "jsonfile";
import path from "pathe";
import handler from "serve-handler";
import { temporaryDirectory } from "tempy";
import { withDir } from "tmp-promise";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "vitest";

const { readFile: readJson } = jsonfile;

import process from "node:process";
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
		server.listen(port);
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
		await runCommand(
			[
				// This is a single-command CLI, so use "." as the command entrypont per the oclif docs
				".",
				testUrls[0].toString(),
				`--out`,
				downloadDir,
			],
			{
				root: import.meta.url,
			},
		);

		const outputPath = path.join(downloadDir, "test0.json");
		const actual = await readJson(outputPath);
		expect(actual).to.deep.equal({
			key1: 1,
			key2: {
				nested: "object",
			},
		});
	});

	it("filename flag with --out", async () => {
		// process.chdir(downloadDir);
		const filename = "filename-flag-test.json";
		// path.join(downloadDir, "filename-flag-test.json");
		await runCommand(
			[
				// This is a single-command CLI, so use "." as the command entrypont per the oclif docs
				".",
				testUrls[0].toString(),
				`--out`,
				downloadDir,
				`--filename`,
				filename,
			],
			{
				root: import.meta.url,
			},
		);

		const outputPath = path.join(downloadDir, "filename-flag-test.json");
		const actual = await readJson(outputPath);
		expect(actual).to.deep.equal({
			key1: 1,
			key2: {
				nested: "object",
			},
		});
	});

	it("compressed file with --extract", async () => {
		await runCommand(
			[
				// This is a single-command CLI, so use "." as the command entrypont per the oclif docs
				".",
				testUrls[2].toString(),
				`--out`,
				downloadDir,
				"--extract",
			],
			{
				root: import.meta.url,
			},
		);

		const files = await readdir(downloadDir, { recursive: true });
		expect(files).toMatchSnapshot();
	});

	describe("using current working directory", () => {
		// let originalCwd: string;

		// beforeEach(() => {
		// 	originalCwd = process.cwd();
		// 	console.log(`original dir: ${originalCwd}`);
		// 	process.chdir(downloadDir);
		// 	console.log(`working dir: ${downloadDir}`);
		// });

		// afterEach(() => {
		// 	process.chdir(originalCwd);
		// });

		// biome-ignore lint/suspicious/noSkippedTests: feature doesn't work yet
		it.skip("with --filename", async () => {
			// const startingDir = process.cwd();
			await withDir(
				async ({ path: dlDir }) => {
					process.chdir(dlDir);
					const filename = "filename-flag-test.json";
					// path.join(downloadDir, "filename-flag-test.json");
					const { stdout } = await runCommand(
						[
							// This is a single-command CLI, so use "." as the command entrypont per the oclif docs
							".",
							testUrls[0].toString(),
							`--filename ${filename}`,
						],
						{
							root: import.meta.url,
						},
					);

					expect(stdout).to.contain("Downloading ");

					const outputPath = path.join(dlDir, "filename-flag-test.json");
					const actual = await readJson(outputPath);
					expect(actual).to.deep.equal({
						key1: 1,
						key2: {
							nested: "object",
						},
					});
				},
				{
					// usafeCleanup ensures the cleanup doesn't fail if there are files in the directory
					unsafeCleanup: true,
				},
			);
		});

		// it("--filename flag", async () => {
		// 	// process.chdir(downloadDir);
		// 	const filename = "filename-flag-test.json";
		// 	// path.join(downloadDir, "filename-flag-test.json");
		// 	const { stdout } = await runCommand(
		// 		[
		// 			// This is a single-command CLI, so use "." as the command entrypont per the oclif docs
		// 			".",
		// 			testUrls[0].toString(),
		// 			`--filename ${filename}`,
		// 		],
		// 		{
		// 			root: import.meta.url,
		// 		},
		// 	);

		// 	expect(stdout).to.contain("Downloading ");

		// 	const outputPath = path.join(downloadDir, "filename-flag-test.json");
		// 	const actual = await readJson(outputPath);
		// 	expect(actual).to.deep.equal({
		// 		key1: 1,
		// 		key2: {
		// 			nested: "object",
		// 		},
		// 	});
		// });
	});
});
