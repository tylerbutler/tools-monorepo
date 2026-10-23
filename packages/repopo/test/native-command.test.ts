import { ChildProcess, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Config } from "@oclif/core";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { CheckNative } from "../src/commands/check-native.js";
import { Prepare } from "../src/commands/prepare.js";

vi.mock("node:child_process", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:child_process")>();
	return { ...actual, spawn: vi.fn() };
});

describe("native command wrappers", () => {
	let config: Config;
	const previousExitCode = process.exitCode;
	const paths = [
		"--binary-path",
		"/fake/core",
		"--sidecar-path",
		"/fake/sidecar.mjs",
	];

	beforeAll(async () => {
		config = await Config.load(fileURLToPath(new URL("..", import.meta.url)));
	});
	beforeEach(() => {
		vi.mocked(spawn).mockReset();
		process.exitCode = previousExitCode;
	});
	afterEach(() => {
		process.exitCode = previousExitCode;
	});

	function closeWith(code: number | null): void {
		vi.mocked(spawn).mockImplementationOnce(() => {
			const child = new ChildProcess();
			queueMicrotask(() => child.emit("close", code));
			return child;
		});
	}

	it.each([
		"auto",
		"quickjs",
		"ipc",
	])("forwards --mode %s without loading the config in Node", async (mode) => {
		closeWith(0);
		const command = new CheckNative(
			[...paths, "--config", "/does-not-exist/config.ts", "--mode", mode],
			config,
		);
		await command.init();
		await command.run();
		expect(spawn).toHaveBeenCalledWith(
			"/fake/core",
			[
				"check",
				"--sidecar-path",
				"/fake/sidecar.mjs",
				"--concurrency",
				"8",
				"--mode",
				mode,
				"--config",
				"/does-not-exist/config.ts",
			],
			expect.objectContaining({ stdio: "inherit" }),
		);
	});

	it("prepares through the native binary without evaluating a Node config", async () => {
		closeWith(0);
		const command = new Prepare(
			[
				...paths,
				"--config",
				"/does-not-exist/config.ts",
				"--runtime",
				"node",
				"--quiet",
			],
			config,
		);
		await command.init();
		await command.run();
		expect(spawn).toHaveBeenCalledWith(
			"/fake/core",
			[
				"prepare",
				"--sidecar-path",
				"/fake/sidecar.mjs",
				"--config",
				"/does-not-exist/config.ts",
				"--runtime",
				"node",
				"--quiet",
			],
			expect.objectContaining({ stdio: "inherit" }),
		);
	});

	it.each([
		1,
		7,
		null,
	])("retains a native failure status of %s", async (code) => {
		closeWith(code);
		await new Prepare(paths, config).run();
		expect(process.exitCode).toBe(code ?? 1);
	});

	it("reports binary launch failures instead of returning success", async () => {
		vi.mocked(spawn).mockImplementationOnce(() => {
			const child = new ChildProcess();
			queueMicrotask(() => child.emit("error", new Error("permission denied")));
			return child;
		});
		await expect(new Prepare(paths, config).run()).rejects.toThrow(
			"permission denied",
		);
	});
});
