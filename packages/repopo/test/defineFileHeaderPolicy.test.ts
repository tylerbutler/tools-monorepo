import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { EOL, tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PolicyFailure, PolicyFixResult } from "../src/policy.js";
import {
	defineFileHeaderPolicy,
	type FileHeaderGeneratorConfig,
} from "../src/policyDefiners/defineFileHeaderPolicy.js";
import { runHandler } from "./test-helpers.js";

describe("defineFileHeaderPolicy", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "repopo-header-test-"));
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("Policy Creation", () => {
		it("should create a PolicyDefinition with correct structure", () => {
			const config: FileHeaderGeneratorConfig = {
				match: /\.ts$/,
				lineStart: /\/\/ /,
				lineEnd: /\r?\n/,
				replacer: (fileContent, cfg) =>
					`// ${cfg.headerText}${EOL}${fileContent}`,
			};

			const policy = defineFileHeaderPolicy({
				name: "TestHeaderPolicy",
				description: "Enforces header comments in TypeScript files",
				config,
			});

			expect(policy.name).toBe("TestHeaderPolicy");
			expect(policy.match).toEqual(/\.ts$/);
			expect(policy.handler).toBeDefined();
			expect(typeof policy.handler).toBe("function");
		});

		it("should use config match pattern", () => {
			const config: FileHeaderGeneratorConfig = {
				match: /\.jsx?$/,
				lineStart: /\/\/ /,
				lineEnd: /\r?\n/,
				replacer: (content) => content,
			};

			const policy = defineFileHeaderPolicy({
				name: "JsHeaderPolicy",
				description: "Enforces header comments in JavaScript files",
				config,
			});

			expect("file.js").toMatch(policy.match);
			expect("file.jsx").toMatch(policy.match);
			expect("file.ts").not.toMatch(policy.match);
		});
	});

	describe("Header Detection", () => {
		it("should fail when file is missing header", async () => {
			const testFile = join(testDir, "test.ts");
			const content = `const x = 1;${EOL}`;
			await writeFile(testFile, content);

			const config: FileHeaderGeneratorConfig = {
				match: /\.ts$/,
				lineStart: /\/\/ /,
				lineEnd: /\r?\n/,
				replacer: (fileContent, cfg) =>
					`// ${cfg.headerText}${EOL}${fileContent}`,
			};

			const policy = defineFileHeaderPolicy({
				name: "TestPolicy",
				description: "Test file header policy",
				config,
			});

			const result = (await runHandler(policy.handler, {
				file: testFile,
				root: testDir,
				resolve: false,
				config: { headerText: "Copyright 2025" },
			})) as PolicyFailure;

			expect(result).not.toBe(true);
			expect(result).toHaveProperty("autoFixable", true);
			expect(result.errorMessages.join()).toContain(".ts file missing header");
		});

		it("should pass when config is undefined", async () => {
			const testFile = join(testDir, "test.ts");
			await writeFile(testFile, "const x = 1;");

			const config: FileHeaderGeneratorConfig = {
				match: /\.ts$/,
				lineStart: /\/\/ /,
				lineEnd: /\r?\n/,
				replacer: (content) => content,
			};

			const policy = defineFileHeaderPolicy({
				name: "TestPolicy",
				description: "Test file header policy",
				config,
			});

			const result = await runHandler(policy.handler, {
				file: testFile,
				root: testDir,
				resolve: false,
				config: undefined,
			});

			expect(result).toBe(true);
		});
	});

	describe("Auto-Fix Behavior", () => {
		it("should mark as auto-fixable", async () => {
			const testFile = join(testDir, "test.ts");
			await writeFile(testFile, "const x = 1;");

			const config: FileHeaderGeneratorConfig = {
				match: /\.ts$/,
				lineStart: /\/\/ /,
				lineEnd: /\r?\n/,
				replacer: (fileContent, cfg) =>
					`// ${cfg.headerText}${EOL}${fileContent}`,
			};

			const policy = defineFileHeaderPolicy({
				name: "TestPolicy",
				description: "Test file header policy",
				config,
			});

			const result = (await runHandler(policy.handler, {
				file: testFile,
				root: testDir,
				resolve: false,
				config: { headerText: "Copyright 2025" },
			})) as PolicyFailure;

			expect(result.autoFixable).toBe(true);
		});

		it("should fix missing header when resolve is true", async () => {
			const headerText = "Copyright 2025 My Company";
			const testFile = join(testDir, "test.ts");
			const originalContent = `const x = 1;${EOL}`;
			await writeFile(testFile, originalContent);

			const config: FileHeaderGeneratorConfig = {
				match: /\.ts$/,
				lineStart: /\/\/ /,
				lineEnd: /\r?\n/,
				replacer: (fileContent, cfg) =>
					`// ${cfg.headerText}${EOL}${fileContent}`,
			};

			const policy = defineFileHeaderPolicy({
				name: "TestPolicy",
				description: "Test file header policy",
				config,
			});

			const result = (await runHandler(policy.handler, {
				file: testFile,
				root: testDir,
				resolve: true,
				config: { headerText },
			})) as PolicyFixResult;

			expect(result.resolved).toBe(true);
			expect(result.autoFixable).toBe(true);

			// Verify file was actually updated
			const newContent = await readFile(testFile, "utf-8");
			expect(newContent).toContain(`// ${headerText}`);
			expect(newContent).toContain("const x = 1;");
		});

		it("should not modify file when resolve is false", async () => {
			const testFile = join(testDir, "test.ts");
			const originalContent = `const x = 1;${EOL}`;
			await writeFile(testFile, originalContent);

			const config: FileHeaderGeneratorConfig = {
				match: /\.ts$/,
				lineStart: /\/\/ /,
				lineEnd: /\r?\n/,
				replacer: (fileContent, cfg) =>
					`// ${cfg.headerText}${EOL}${fileContent}`,
			};

			const policy = defineFileHeaderPolicy({
				name: "TestPolicy",
				description: "Test file header policy",
				config,
			});

			await runHandler(policy.handler, {
				file: testFile,
				root: testDir,
				resolve: false,
				config: { headerText: "Copyright 2025" },
			});

			// Verify file was NOT modified
			const content = await readFile(testFile, "utf-8");
			expect(content).toBe(originalContent);
		});

		it("should preserve existing content when adding header", async () => {
			const headerText = "Header Text";
			const testFile = join(testDir, "test.ts");
			const originalContent = `const x = 1;${EOL}const y = 2;${EOL}export { x, y };`;
			await writeFile(testFile, originalContent);

			const config: FileHeaderGeneratorConfig = {
				match: /\.ts$/,
				lineStart: /\/\/ /,
				lineEnd: /\r?\n/,
				replacer: (fileContent, cfg) =>
					`// ${cfg.headerText}${EOL}${fileContent}`,
			};

			const policy = defineFileHeaderPolicy({
				name: "TestPolicy",
				description: "Test file header policy",
				config,
			});

			await runHandler(policy.handler, {
				file: testFile,
				root: testDir,
				resolve: true,
				config: { headerText },
			});

			const newContent = await readFile(testFile, "utf-8");
			expect(newContent).toContain(originalContent);
			expect(newContent).toContain(`// ${headerText}`);
		});
	});

	describe("Error Messages", () => {
		it("should include file extension in error message", async () => {
			const testFile = join(testDir, "test.ts");
			await writeFile(testFile, "const x = 1;");

			const config: FileHeaderGeneratorConfig = {
				match: /\.ts$/,
				lineStart: /\/\/ /,
				lineEnd: /\r?\n/,
				replacer: (fileContent, cfg) =>
					`// ${cfg.headerText}${EOL}${fileContent}`,
			};

			const policy = defineFileHeaderPolicy({
				name: "TestPolicy",
				description: "Test file header policy",
				config,
			});

			const result = (await runHandler(policy.handler, {
				file: testFile,
				root: testDir,
				resolve: false,
				config: { headerText: "Copyright" },
			})) as PolicyFailure;

			expect(result.errorMessages.join()).toContain(".ts");
			expect(result.errorMessages.join()).toContain("missing header");
		});

		it("should include policy name in failure", async () => {
			const testFile = join(testDir, "test.ts");
			await writeFile(testFile, "const x = 1;");

			const config: FileHeaderGeneratorConfig = {
				match: /\.ts$/,
				lineStart: /\/\/ /,
				lineEnd: /\r?\n/,
				replacer: (fileContent, cfg) =>
					`// ${cfg.headerText}${EOL}${fileContent}`,
			};

			const policy = defineFileHeaderPolicy({
				name: "CustomHeaderPolicy",
				description: "Custom file header policy",
				config,
			});

			const result = (await runHandler(policy.handler, {
				file: testFile,
				root: testDir,
				resolve: false,
				config: { headerText: "Copyright" },
			})) as PolicyFailure;

			expect(result.name).toBe("CustomHeaderPolicy");
		});
	});
});
