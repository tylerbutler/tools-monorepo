import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "pathe";
import { simpleGit } from "simple-git";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("TypeScript check/list CLI", () => {
	let root: string;
	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), "repopo-cli-"));
		const git = simpleGit(root);
		await git.init();
		await writeFile(join(root, "one.txt"), "one");
		await writeFile(join(root, "two.txt"), "two");
		await git.add(".");
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});
	async function invoke(
		policies: string,
		{ stdin = "one.txt\n", fix = false, exclude = "[]" } = {},
		command = "check",
	) {
		const config = join(root, "repopo.config.mjs");
		await writeFile(
			config,
			`export default { policies: ${policies}, excludeFiles: ${exclude} };`,
		);
		return new Promise<{ output: string; code: string | number | undefined }>(
			(resolve) => {
				const child = execFile(
					process.execPath,
					[
						fileURLToPath(new URL("../bin/run.js", import.meta.url)),
						command,
						"--config",
						config,
						...(command === "check" ? ["--stdin"] : []),
						...(fix ? ["--fix"] : []),
					],
					{ cwd: root, timeout: 15000 },
					(error, stdout, stderr) => {
						resolve({ output: stdout + stderr, code: error?.code });
					},
				);
				child.stdin?.end(stdin);
			},
		);
	}
	const file = 'name: "File", description: "File check", match: /\\.txt$/';
	const repository =
		'name: "Repository", description: "Repository check", scope: "repository"';

	it("reports independent file findings with manual guidance and a failing status", async () => {
		const result = await invoke(`[{ ${file}, handler: async () => [
			{ message: "first issue", manualFix: "Use the shared helper." },
			{ message: "second issue", fixStatus: "available" }
		] }]`);
		expect(result.code).toBe(1);
		expect(result.output).toContain("one.txt: first issue");
		expect(result.output).toContain("one.txt: second issue");
		expect(result.output).toContain("Manual fix: Use the shared helper.");
		expect(result.output).not.toContain("two.txt: first issue");
	});
	it.each([
		"one.txt\n",
		"",
	])("runs repository policies against full inventory for stdin %j", async (stdin) => {
		const result = await invoke(
			`[{ ${repository}, handler: async ({ files }) => [
			{ message: files.includes("two.txt") ? "Full context" : "Missing context" },
			{ message: "Related files", files: ["one.txt", "two.txt"] }
		] }]`,
			{ stdin },
		);
		expect(result.code).toBe(1);
		expect(result.output).toContain("Full context");
		expect(result.output).toContain("one.txt, two.txt");
		expect(result.output).not.toContain("Missing context");
	});
	it("preserves case-sensitive global exclusion flags", async () => {
		const result = await invoke(
			`[{ ${file}, handler: async () => [{ message: "still checked" }] }]`,
			{ exclude: "[/^ONE/]" },
		);
		expect(result.code).toBe(1);
		expect(result.output).toContain("still checked");
	});
	it.each([
		"café.txt",
		"tab\tname.txt",
		"line\nname.txt",
	])("preserves unusual Git paths: %j", async (name) => {
		await writeFile(join(root, name), "content");
		const result = await invoke(
			`[{ ${file}, handler: async ({ file }) => [{ message: JSON.stringify(file) }] }]`,
			{ stdin: `${name}\0` },
		);
		expect(result.output).toContain(JSON.stringify(name));
		expect(result.code).toBe(1);
	});
	it.each([
		["fixed", undefined],
		["failed", 1],
		["available", 1],
	])("treats only %s as resolved", async (status, code) => {
		const result = await invoke(
			`[{ ${file}, handler: async () => [{ message: "issue", fixStatus: "${status}", manualFix: "Correction" }] }]`,
			{ fix: true },
		);
		expect(result.code).toBe(code);
		expect(result.output).toContain("issue");
		if (status === "fixed") {
			expect(result.output).toContain("Resolved");
			expect(result.output).not.toContain("Manual fix:");
		} else {
			expect(result.output).toContain("Manual fix: Correction");
		}
	});
	it("reports standalone fixes while preserving unrelated unresolved findings", async () => {
		const result = await invoke(
			`[{ ${file},
			handler: async () => [{ message: "fixable" }, { message: "manual", manualFix: "Edit manually" }],
			resolver: async ({ findings }) => [{ ...findings[0], fixStatus: "fixed" }]
		}]`,
			{ fix: true },
		);
		expect(result.code).toBe(1);
		expect(result.output).toContain("Resolved File: one.txt: fixable");
		expect(result.output).toContain("one.txt: manual");
		expect(result.output).toContain("Edit manually");
	});
	it.each([
		"true",
		'({ error: "legacy" })',
		'[{ message: "illegal", fixStatus: "fixed" }]',
	])("fails on execution-contract errors: %s", async (outcome) => {
		const result = await invoke(
			`[{ ${file}, handler: async () => ${outcome} }]`,
		);
		expect(result.code).toBe(1);
		expect(result.output).toContain("Execution error (contract, handle)");
	});
	it("fails on thrown errors, reports skipped fix work, and continues other files", async () => {
		const result = await invoke(
			`[
			{ ${file}, handler: async ({ file }) => { if (file === "one.txt") throw new Error("broken writer"); return [{ message: "other file" }]; } },
			{ name: "After", description: "After", match: /\\.txt$/, handler: async () => [{ message: "after" }] },
			{ ${repository}, handler: async () => [{ message: "must not run" }] }
		]`,
			{ stdin: "one.txt\ntwo.txt\n", fix: true },
		);
		expect(result.code).toBe(1);
		expect(result.output).toContain("broken writer");
		expect(result.output).toContain("two.txt: other file");
		expect(result.output).not.toContain("must not run");
	});
	it("lists stable identities and explicit scopes without invoking handlers", async () => {
		const result = await invoke(
			`[
			{ ${file}, instanceId: "first", handler: async () => { throw new Error("must not execute"); } },
			{ ${repository}, instanceId: "second", handler: async () => [] }
		]`,
			{},
			"list",
		);
		expect(result.code).toBeUndefined();
		expect(result.output).toContain("first");
		expect(result.output).toContain("scope: file");
		expect(result.output).toContain("second");
		expect(result.output).toContain("scope: repository");
	});
});
