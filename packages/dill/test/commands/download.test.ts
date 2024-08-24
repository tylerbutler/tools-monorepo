import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { runCommand } from "@oclif/test";
// import { fs, vol } from "memfs";
import handler from "serve-handler";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

import { withDir } from "tmp-promise";
import { testDataPath, testUrls } from "../common.js";

describe("download command", () => {
	// tell vitest to use fs mock from __mocks__ folder
	// this can be done in a setup file if fs should always be mocked
	// vi.mock("node:fs");
	// vi.mock("node:fs/promises");
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

	afterAll(() => {
		server.close();
	});

	it("downloads json", async () => {
		await withDir(
			async ({ path: downloadDir }) => {
				const outputPath = path.join(downloadDir, "test0.json");
				const { stdout, stderr, error, result } = await runCommand(
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

				expect(stdout).toMatchSnapshot();
				expect(stderr).toMatchSnapshot();
				expect(error).toMatchSnapshot();
				expect(result).toMatchSnapshot();

				const actual = await readFile(outputPath);
				expect(actual).toMatchSnapshot();
			},
			{
				// usafeCleanup ensures the cleanup doesn't fail if there are files in the directory
				unsafeCleanup: true,
			},
		);
	});
});
