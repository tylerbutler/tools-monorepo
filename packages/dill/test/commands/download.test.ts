import http from "node:http";
import path from "node:path";
import { runCommand } from "@oclif/test";
import { fs, vol } from "memfs";
import handler from "serve-handler";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

import { testDataPath, testUrls } from "../common.js";

describe("download command", () => {
	// tell vitest to use fs mock from __mocks__ folder
	// this can be done in a setup file if fs should always be mocked
	vi.mock("node:fs");
	vi.mock("node:fs/promises");
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

	beforeEach(() => {
		// reset the state of in-memory fs
		vol.reset();
		vol.fromJSON(
			{
				"./dir1/hw.txt": "hello dir1",
				"./dir2/hw.txt": "hello dir2",
				"./tmp/download.json": "",
			},
			// {},
			// default cwd
			"/tmp",
		);
	});

	it("downloads json", async () => {
		const root = path.join(
			import.meta.url,
			// "../../../esm",
		);
		const { stdout, stderr, error, result } = await runCommand(
			[
				// This is a single-command CLI, so use "." as the command entrypont per the oclif docs
				// ".",
				"download",
				"--out",
				"/tmp/download.json",
				testUrls[0].toString(),
			],
			{
				root,
			},
		);
		// expect(stdout).toMatchSnapshot();
		// expect(stderr).toMatchSnapshot();
		// expect(error).toMatchSnapshot();
		// expect(result).toMatchSnapshot();

		const test = fs.readFileSync("/tmp/dir1/hw.txt");
		expect(test).toMatchSnapshot();
		const actual = fs.readFileSync("/tmp/download.json");
		expect(stdout).toMatchSnapshot();
		expect(actual).toMatchSnapshot();
	});
});
