import http from "node:http";
import path from "node:path";
import { runCommand } from "@oclif/test";
import { expect } from "chai";
import { readJson } from "fs-extra/esm";
import { after as afterAll, before as beforeAll, describe, it } from "mocha";
import handler from "serve-handler";

import { withDir } from "tmp-promise";
import { testDataPath, testUrls } from "../common.js";

describe("download command", () => {
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

				expect(stdout).to.contain("Downloading ");
				// expect(stderr).toMatchSnapshot();
				// expect(error).toMatchSnapshot();
				// expect(result).toMatchSnapshot();

				const actual = await readJson(outputPath);
				expect(actual).to.deep.equal({
					key1: 1,
					key2: {
						nested: "object",
					},
				});
				// expect(actual).toMatchSnapshot();
			},
			{
				// usafeCleanup ensures the cleanup doesn't fail if there are files in the directory
				unsafeCleanup: true,
			},
		);
	});
});
