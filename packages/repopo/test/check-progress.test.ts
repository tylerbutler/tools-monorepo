import process from "node:process";
import { Config } from "@oclif/core";
import { createSpinner } from "nanospinner";
import { simpleGit } from "simple-git";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckPolicy } from "../src/commands/check.js";
import { newPerfStats } from "../src/perf.js";
import { runPolicies } from "../src/runner.js";

vi.mock("nanospinner", () => ({ createSpinner: vi.fn() }));
vi.mock("../src/runner.js", () => ({ runPolicies: vi.fn() }));
vi.mock("../src/repositoryFiles.js", () => ({
	readRepositoryFiles: vi.fn().mockResolvedValue([]),
}));

class ProgressCheck extends CheckPolicy<typeof ProgressCheck> {
	public override flags = {
		quiet: false,
		verbose: false,
		fix: false,
		stdin: false,
		concurrency: 1,
		config: undefined,
	};
	protected override _logger = {
		log: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
		verbose: vi.fn(),
		warning: vi.fn(),
		error: vi.fn(),
	};
}

describe("check progress", () => {
	const stdoutTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
	const stderrTTY = Object.getOwnPropertyDescriptor(process.stderr, "isTTY");
	const progress = {
		start: vi.fn().mockReturnThis(),
		stop: vi.fn().mockReturnThis(),
	};
	let command: ProgressCheck;

	beforeEach(() => {
		vi.stubEnv("CI", undefined);
		vi.stubEnv("TERM", "xterm");
		Object.defineProperty(process.stdout, "isTTY", {
			configurable: true,
			value: true,
		});
		Object.defineProperty(process.stderr, "isTTY", {
			configurable: true,
			value: true,
		});
		command = new ProgressCheck([], new Config({ root: process.cwd() }));
		vi.spyOn(command, "git", "get").mockReturnValue(simpleGit());
		vi.spyOn(command, "getContext").mockResolvedValue({
			gitRoot: process.cwd(),
			policies: [],
			excludeFromAll: [],
			excludePoliciesForFiles: new Map(),
			perfStats: newPerfStats(),
		});
		vi.mocked(createSpinner).mockReturnValue(
			progress as unknown as ReturnType<typeof createSpinner>,
		);
		vi.mocked(runPolicies).mockResolvedValue({
			findings: [],
			errors: [],
			skipped: [],
			perfStats: newPerfStats(),
		});
	});

	afterEach(() => {
		for (const [stream, descriptor] of [
			[process.stdout, stdoutTTY],
			[process.stderr, stderrTTY],
		] as const) {
			if (descriptor) {
				Object.defineProperty(stream, "isTTY", descriptor);
			} else {
				Reflect.deleteProperty(stream, "isTTY");
			}
		}
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	it("starts interactive progress on stderr and stops after completion", async () => {
		await command.run();
		expect(createSpinner).toHaveBeenCalledWith("Checking policies...", {
			stream: process.stderr,
		});
		expect(progress.start).toHaveBeenCalledOnce();
		expect(progress.stop).toHaveBeenCalledOnce();
	});

	it("stops progress when execution throws", async () => {
		vi.mocked(runPolicies).mockRejectedValueOnce(new Error("broken"));
		await expect(command.run()).rejects.toThrow("broken");
		expect(progress.stop).toHaveBeenCalledOnce();
	});

	it.each([
		"quiet",
		"verbose",
		"CI",
		"stdout",
		"stderr",
		"dumb",
	] as const)("does not create progress for %s", async (mode) => {
		if (mode === "quiet" || mode === "verbose") {
			command.flags[mode] = true;
		} else if (mode === "CI") {
			vi.stubEnv("CI", "true");
		} else if (mode === "dumb") {
			vi.stubEnv("TERM", "dumb");
		} else {
			Object.defineProperty(process[mode], "isTTY", { value: false });
		}
		await command.run();
		expect(createSpinner).not.toHaveBeenCalled();
	});
});
