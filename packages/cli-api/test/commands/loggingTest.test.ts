import { runCommand } from "@oclif/test";
import { describe, expect, it } from "vitest";

describe("BaseCommand logging", () => {
	it.each([
		{ flags: [], info: true, verbose: false },
		{ flags: ["--verbose"], info: true, verbose: true },
		{ flags: ["--quiet"], info: false, verbose: false },
		{ flags: ["--verbose", "--quiet"], info: false, verbose: false },
	])("keeps command output and diagnostics separate: $flags", async (mode) => {
		const { stdout, stderr, error } = await runCommand(
			["loggingTest", "--method=all", "--message=example", ...mode.flags],
			{ root: import.meta.url },
		);
		expect(error).toBeUndefined();
		expect(stdout.trim()).toBe("example");
		expect(stderr).toContain("WARNING: example");
		expect(stderr).toContain("ERROR: example");
		for (const prefix of ["INFO", "SUCCESS"]) {
			expect(stderr.includes(`${prefix}: example`)).toBe(mode.info);
		}
		expect(stderr.includes("VERBOSE: example")).toBe(mode.verbose);
	});

	it.each([
		"info",
		"warning",
		"logError",
		"verbose",
	])("formats Error objects through %s", async (method) => {
		const { stdout, stderr, error } = await runCommand(
			[
				"loggingTest",
				`--method=${method}`,
				"--message=error-detail",
				"--use-error",
				"--verbose",
			],
			{ root: import.meta.url },
		);
		expect(error).toBeUndefined();
		expect(stdout).toBe("");
		expect(stderr).toContain("error-detail");
	});

	it("keeps debug warnings visible in quiet mode", async () => {
		const { stderr, error } = await runCommand(
			[
				"loggingTest",
				"--method=warningWithDebugTrace",
				"--message=caution",
				"--quiet",
			],
			{ root: import.meta.url },
		);
		expect(error).toBeUndefined();
		expect(stderr).toContain("WARNING: caution");
	});

	it.each([
		{ flags: [] },
		{ flags: ["--quiet"] },
	])("preserves exit errors and status with $flags", async ({ flags }) => {
		const { error } = await runCommand(
			[
				"loggingTest",
				"--method=exit",
				"--message=failed",
				"--exit-code=2",
				...flags,
			],
			{ root: import.meta.url },
		);
		expect(error?.message).toBe("failed");
		expect(error?.oclif?.exit).toBe(2);
	});

	it("preserves numeric exits", async () => {
		const { error } = await runCommand(
			["loggingTest", "--method=exitWithCode", "--exit-code=42"],
			{ root: import.meta.url },
		);
		expect(error?.oclif?.exit).toBe(42);
	});
});
