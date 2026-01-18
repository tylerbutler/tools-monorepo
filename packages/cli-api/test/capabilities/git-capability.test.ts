import fs from "node:fs";
import os from "node:os";
import path from "pathe";
import type { Config } from "@oclif/core";
import { simpleGit } from "simple-git";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaseCommand } from "../../src/baseCommand.js";
import { GitCapability, useGit } from "../../src/capabilities/git.js";

class TestCommand extends BaseCommand<typeof TestCommand> {
	public static override readonly description = "Test command";
	public errorSpy = vi.fn();

	public override error(
		message: string | Error,
		options?: { exit: number },
	): never {
		this.errorSpy(message, options);
		throw new Error(message.toString());
	}
}

describe("GitCapability", () => {
	let command: TestCommand;
	let mockConfig: Config;
	let tempDir: string;
	let gitRepoDir: string;

	beforeEach(async () => {
		mockConfig = {
			root: "/test/root",
			bin: "test-cli",
			version: "1.0.0",
			// biome-ignore lint/suspicious/noExplicitAny: Test config mock requires partial Config object
			pjson: {} as any,
		} as Config;

		command = new TestCommand([], mockConfig);
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "git-test-"));

		// Create a real git repo for testing
		gitRepoDir = path.join(tempDir, "repo");
		fs.mkdirSync(gitRepoDir);

		const git = simpleGit(gitRepoDir);
		await git.init();
		await git.addConfig("user.name", "Test User");
		await git.addConfig("user.email", "test@example.com");

		// Create initial commit
		fs.writeFileSync(path.join(gitRepoDir, "README.md"), "# Test Repo");
		await git.add("README.md");
		await git.commit("Initial commit");
	});

	afterEach(() => {
		// Clean up temp directory
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	describe("initialization in git repo", () => {
		it("should initialize git client and repository", async () => {
			const capability = new GitCapability({
				baseDir: gitRepoDir,
				required: true,
			});

			const result = await capability.initialize(command);

			expect(result.git).toBeDefined();
			expect(result.repo).toBeDefined();
			expect(result.getCurrentBranch).toBeInstanceOf(Function);
			expect(result.isCleanWorkingTree).toBeInstanceOf(Function);
			expect(result.hasUncommittedChanges).toBeInstanceOf(Function);
		});

		it("should detect git repository correctly", async () => {
			const capability = new GitCapability({
				baseDir: gitRepoDir,
				required: true,
			});

			const result = await capability.initialize(command);
			const isRepo = await result.git.checkIsRepo();

			expect(isRepo).toBe(true);
		});
	});

	describe("helper methods", () => {
		it("should get current branch name", async () => {
			const capability = new GitCapability({
				baseDir: gitRepoDir,
				required: true,
			});
			const result = await capability.initialize(command);

			const branch = await result.getCurrentBranch();

			// Default branch should be master or main
			expect(["master", "main"]).toContain(branch);
		});

		it("should detect clean working tree", async () => {
			const capability = new GitCapability({
				baseDir: gitRepoDir,
				required: true,
			});
			const result = await capability.initialize(command);

			const isClean = await result.isCleanWorkingTree();

			expect(isClean).toBe(true);
		});

		it("should detect uncommitted changes", async () => {
			// Add a new file
			fs.writeFileSync(path.join(gitRepoDir, "new-file.txt"), "content");

			const capability = new GitCapability({
				baseDir: gitRepoDir,
				required: true,
			});
			const result = await capability.initialize(command);

			const hasChanges = await result.hasUncommittedChanges();

			expect(hasChanges).toBe(true);
		});

		it("should detect no uncommitted changes when clean", async () => {
			const capability = new GitCapability({
				baseDir: gitRepoDir,
				required: true,
			});
			const result = await capability.initialize(command);

			const hasChanges = await result.hasUncommittedChanges();

			expect(hasChanges).toBe(false);
		});
	});

	describe("error handling", () => {
		it("should error when not in git repo and required", async () => {
			const nonGitDir = path.join(tempDir, "non-git");
			fs.mkdirSync(nonGitDir);

			const capability = new GitCapability({
				baseDir: nonGitDir,
				required: true,
			});

			await expect(capability.initialize(command)).rejects.toThrow();
			expect(command.errorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Not a git repository"),
				{ exit: 1 },
			);
		});

		it("should not error when not in git repo and optional", async () => {
			const nonGitDir = path.join(tempDir, "non-git");
			fs.mkdirSync(nonGitDir);

			const capability = new GitCapability({
				baseDir: nonGitDir,
				required: false,
			});

			const result = await capability.initialize(command);

			// Should still return git/repo objects, but they won't work
			expect(result.git).toBeDefined();
			expect(result.repo).toBeDefined();
			expect(result.isRepo).toBe(false);
		});

		it("should throw when calling getCurrentBranch outside git repo", async () => {
			const nonGitDir = path.join(tempDir, "non-git");
			fs.mkdirSync(nonGitDir);

			const capability = new GitCapability({
				baseDir: nonGitDir,
				required: false,
			});

			const result = await capability.initialize(command);

			await expect(result.getCurrentBranch()).rejects.toThrow(
				"Cannot get current branch: not in a git repository",
			);
		});

		it("should throw when calling isCleanWorkingTree outside git repo", async () => {
			const nonGitDir = path.join(tempDir, "non-git");
			fs.mkdirSync(nonGitDir);

			const capability = new GitCapability({
				baseDir: nonGitDir,
				required: false,
			});

			const result = await capability.initialize(command);

			await expect(result.isCleanWorkingTree()).rejects.toThrow(
				"Cannot check working tree: not in a git repository",
			);
		});

		it("should throw when calling hasUncommittedChanges outside git repo", async () => {
			const nonGitDir = path.join(tempDir, "non-git");
			fs.mkdirSync(nonGitDir);

			const capability = new GitCapability({
				baseDir: nonGitDir,
				required: false,
			});

			const result = await capability.initialize(command);

			await expect(result.hasUncommittedChanges()).rejects.toThrow(
				"Cannot check uncommitted changes: not in a git repository",
			);
		});
	});

	describe("useGit helper", () => {
		it("should create capability holder with git capability", async () => {
			const holder = useGit(command, { baseDir: gitRepoDir, required: true });

			expect(holder.isInitialized).toBe(false);

			const result = await holder.get();

			expect(holder.isInitialized).toBe(true);
			expect(result.git).toBeDefined();
			expect(result.repo).toBeDefined();
		});

		it("should work with default options", async () => {
			// Change to git repo directory to test default baseDir
			const originalCwd = process.cwd();
			process.chdir(gitRepoDir);

			try {
				const holder = useGit(command);
				const result = await holder.get();

				expect(result.git).toBeDefined();
				const isRepo = await result.git.checkIsRepo();
				expect(isRepo).toBe(true);
			} finally {
				process.chdir(originalCwd);
			}
		});
	});

	describe("custom base directory", () => {
		it("should use custom base directory", async () => {
			const capability = new GitCapability({
				baseDir: gitRepoDir,
				required: true,
			});

			const result = await capability.initialize(command);
			const isRepo = await result.git.checkIsRepo();

			expect(isRepo).toBe(true);
		});

		it("should default to current working directory", async () => {
			const originalCwd = process.cwd();
			process.chdir(gitRepoDir);

			try {
				const capability = new GitCapability({ required: true });
				const result = await capability.initialize(command);
				const isRepo = await result.git.checkIsRepo();

				expect(isRepo).toBe(true);
			} finally {
				process.chdir(originalCwd);
			}
		});
	});

	describe("repository wrapper", () => {
		it("should provide Repository wrapper with helper methods", async () => {
			const capability = new GitCapability({
				baseDir: gitRepoDir,
				required: true,
			});
			const result = await capability.initialize(command);

			// Repository should have the git client
			expect(result.repo.gitClient).toBe(result.git);
		});
	});
});
