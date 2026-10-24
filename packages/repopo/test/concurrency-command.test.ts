import { ChildProcess, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Config } from "@oclif/core";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CheckPolicy } from "../src/commands/check.js";
import { CheckNative } from "../src/commands/check-native.js";

vi.mock("node:child_process", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:child_process")>();
	return { ...actual, spawn: vi.fn() };
});

describe("concurrency CLI options", () => {
	let config: Config;
	beforeAll(async () => {
		config = await Config.load(fileURLToPath(new URL("..", import.meta.url)));
	});

	it.each([
		undefined,
		"1",
		"3",
	])("forwards native concurrency %s", async (concurrency) => {
		const child = new ChildProcess();
		vi.mocked(spawn).mockImplementationOnce(() => {
			queueMicrotask(() => child.emit("close", 0));
			return child;
		});
		const args = [
			"--binary-path",
			"/fake/repopo-core",
			"--sidecar-path",
			"/fake/sidecar.mjs",
		];
		if (concurrency !== undefined) {
			args.push("--concurrency", concurrency);
		}
		await new CheckNative(args, config).run();
		expect(spawn).toHaveBeenLastCalledWith(
			"/fake/repopo-core",
			[
				"check",
				"--sidecar-path",
				"/fake/sidecar.mjs",
				"--concurrency",
				concurrency ?? "8",
			],
			expect.objectContaining({ stdio: "inherit" }),
		);
	});

	it.each([
		"0",
		"-1",
		"1.5",
		"bad",
		"9007199254740992",
	])("rejects %s in both CLIs", async (value) => {
		await expect(
			new CheckNative(["--concurrency", value], config).run(),
		).rejects.toThrow();
		await expect(
			new CheckPolicy(["--concurrency", value], config).init(),
		).rejects.toThrow();
	});
});
