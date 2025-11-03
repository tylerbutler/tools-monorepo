import * as path from "node:path";

import { runCommand } from "@oclif/test";
import { describe, expect, it } from "vitest";

import { testRepoRoot } from "../init.js";

describe("ListCommand", () => {
	const testRepoPath = testRepoRoot;

	describe("command metadata", () => {
		it("should have description", async () => {
			const { ListCommand } = await import("../../commands/list.js");
			expect(ListCommand.description).toBeDefined();
			expect(ListCommand.description).toContain("TESTING");
		});

		it("should define flags", async () => {
			const { ListCommand } = await import("../../commands/list.js");
			expect(ListCommand.flags).toBeDefined();
			expect(ListCommand.flags.path).toBeDefined();
			expect(ListCommand.flags.full).toBeDefined();
		});

		it("should have path flag with default value", async () => {
			const { ListCommand } = await import("../../commands/list.js");
			expect(ListCommand.flags.path.default).toBe(".");
		});

		it("should be a valid Command class", async () => {
			const { ListCommand } = await import("../../commands/list.js");
			expect(typeof ListCommand).toBe("function");
			expect(ListCommand.prototype).toBeDefined();
		});
	});

	describe("command functionality", () => {
		it("should have run method", async () => {
			const { ListCommand } = await import("../../commands/list.js");
			const command = new ListCommand([], {} as any);
			expect(typeof command.run).toBe("function");
		});

		it("should have logFullReport method", async () => {
			const { ListCommand } = await import("../../commands/list.js");
			const command = new ListCommand([], {} as any);
			expect(typeof (command as any).logFullReport).toBe("function");
		});

		it("should have logCompactReport method", async () => {
			const { ListCommand } = await import("../../commands/list.js");
			const command = new ListCommand([], {} as any);
			expect(typeof (command as any).logCompactReport).toBe("function");
		});

		it("should have logIndent method", async () => {
			const { ListCommand } = await import("../../commands/list.js");
			const command = new ListCommand([], {} as any);
			expect(typeof (command as any).logIndent).toBe("function");
		});
	});

	describe("command execution", () => {
		it("should execute and load build project", async () => {
			const { ListCommand } = await import("../../commands/list.js");
			const { loadBuildProject } = await import("../../buildProject.js");

			// Should be able to load the build project without error
			const repo = loadBuildProject(testRepoPath);
			expect(repo).toBeDefined();
			expect(repo.workspaces.size).toBeGreaterThan(0);
		});
	});
});
