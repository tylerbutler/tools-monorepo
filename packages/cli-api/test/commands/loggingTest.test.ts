import { runCommand } from "@oclif/test";
import { describe, expect, it } from "vitest";

/**
 * Tests for BaseCommand logging methods.
 *
 * Note: OCLIF's runCommand doesn't capture console.log output directly since
 * BaseCommand.log() uses the _logger (which calls console.log) rather than
 * OCLIF's ux.stdout. These tests verify that the commands execute correctly
 * and that the command lifecycle works as expected. The actual logger output
 * is tested via the BasicLogger tests which directly test console output.
 */
describe("BaseCommand logging", () => {
	describe("log method", () => {
		it("executes without error", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=log", "--message=helloworld"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});
	});

	describe("success method", () => {
		it("executes without error", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=success", "--message=operationdone"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});
	});

	describe("info method", () => {
		it("executes without error", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=info", "--message=information"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});

		it("handles Error objects", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=info", "--message=errorinfo", "--use-error"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});
	});

	describe("warning method", () => {
		it("executes without error", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=warning", "--message=caution"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});

		it("handles Error objects", async () => {
			const { error } = await runCommand(
				[
					"loggingTest",
					"--method=warning",
					"--message=warningerror",
					"--use-error",
				],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});
	});

	describe("logError method", () => {
		it("executes without error", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=logError", "--message=somethingbroke"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});

		it("handles Error objects", async () => {
			const { error } = await runCommand(
				[
					"loggingTest",
					"--method=logError",
					"--message=criticalfailure",
					"--use-error",
				],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});
	});

	describe("verbose method", () => {
		it("executes with --verbose flag", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=verbose", "--message=debuginfo", "--verbose"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});

		it("executes without --verbose flag (output suppressed)", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=verbose", "--message=hiddendebug"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});
	});

	describe("warningWithDebugTrace method", () => {
		it("executes without error", async () => {
			const { error } = await runCommand(
				[
					"loggingTest",
					"--method=warningWithDebugTrace",
					"--message=tracewarning",
				],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});
	});

	describe("quiet mode", () => {
		it("suppresses success messages with --quiet", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=success", "--message=hiddensuccess", "--quiet"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});

		it("suppresses info messages with --quiet", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=info", "--message=hiddeninfo", "--quiet"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});

		it("suppresses warning messages with --quiet", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=warning", "--message=hiddenwarning", "--quiet"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});

		it("suppresses error messages with --quiet", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=logError", "--message=hiddenerror", "--quiet"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});

		it("suppresses warningWithDebugTrace messages with --quiet", async () => {
			const { error } = await runCommand(
				[
					"loggingTest",
					"--method=warningWithDebugTrace",
					"--message=hiddentrace",
					"--quiet",
				],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});
	});

	describe("exit method", () => {
		it("exits with message and code", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=exit", "--exit-code=2"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeDefined();
			expect(error?.oclif?.exit).toBe(2);
		});

		it("exits with just a code", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=exitWithCode", "--exit-code=42"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeDefined();
			expect(error?.oclif?.exit).toBe(42);
		});
	});

	describe("all methods", () => {
		it("exercises all logging methods without error", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=all", "--message=alltest", "-v"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeUndefined();
		});
	});

	describe("verbose and quiet flags are mutually exclusive", () => {
		it("fails when both --verbose and --quiet are provided", async () => {
			const { error } = await runCommand(
				["loggingTest", "--method=log", "--message=test", "--verbose", "--quiet"],
				{
					root: import.meta.url,
				},
			);
			expect(error).toBeDefined();
			expect(error?.message).toContain("cannot also be provided");
		});
	});
});
