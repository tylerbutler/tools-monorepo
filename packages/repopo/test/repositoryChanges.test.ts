import {
	mkdir,
	mkdtemp,
	rename,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { simpleGit } from "simple-git";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	collectRepositoryInventory,
	type RepositoryChangeOptions,
} from "../src/repositoryChanges.js";

describe("annotated repository inventory", () => {
	let root: string;
	let git: ReturnType<typeof simpleGit>;
	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), "repopo-changes-"));
		git = simpleGit(root);
		await git.init(["--initial-branch=main"]);
		await git.addConfig("user.name", "Test");
		await git.addConfig("user.email", "test@example.invalid");
		vi.stubEnv("GITHUB_BASE_REF", "");
		vi.stubEnv("CI_MERGE_REQUEST_TARGET_BRANCH_NAME", "");
	});
	afterEach(async () => {
		vi.unstubAllEnvs();
		await rm(root, { recursive: true, force: true });
	});
	async function commit(file = "source.txt", content = "original\n") {
		await writeFile(join(root, file), content);
		await git.add(".");
		await git.commit("fixture");
	}
	async function changes(
		options: RepositoryChangeOptions = {},
		directory = root,
	) {
		return (await collectRepositoryInventory(directory, options))
			.filter((entry) => entry.status !== "unchanged")
			.map(({ exists: _exists, ...entry }) => entry);
	}

	it("includes unchanged files and keeps working-tree presence distinct from Git status", async () => {
		await commit();
		await git.checkoutLocalBranch("feature");
		await commit("feature.txt");
		await rm(join(root, "feature.txt"));
		const entries = await collectRepositoryInventory(root, { base: "main" });
		expect(entries).toEqual([
			{ path: "source.txt", status: "unchanged" },
			{ path: "feature.txt", status: "added", exists: false },
		]);
		expect(Object.isFrozen(entries)).toBe(true);
		expect(entries.every(Object.isFrozen)).toBe(true);
	});

	it.skipIf(process.platform === "win32")(
		"does not normalize literal backslashes in Git inventory names",
		async () => {
			const path = `${root}/literal\\name.txt`;
			await writeFile(path, "original");
			await git.add(".");
			await git.commit("fixture");
			await writeFile(path, "modified");
			expect(await collectRepositoryInventory(root, { mode: "local" })).toEqual(
				[{ path: "literal\\name.txt", status: "modified", exists: true }],
			);
		},
	);

	it("distinguishes staged, net local, and untracked changes", async () => {
		await commit();
		await writeFile(join(root, "source.txt"), "staged\n");
		await git.add("source.txt");
		await writeFile(join(root, "source.txt"), "original\n");
		await writeFile(join(root, "new\ncafé.txt"), "new");
		await writeFile(join(root, ".gitignore"), "ignored\n");
		await writeFile(join(root, "ignored"), "ignored");
		expect(await changes({ mode: "staged" })).toEqual([
			{ status: "modified", path: "source.txt" },
		]);
		expect(await changes({ mode: "local" })).toEqual([
			{ status: "added", path: ".gitignore" },
			{ status: "added", path: "new\ncafé.txt" },
		]);
	});

	it("retains rename endpoints, deletions and type changes", async () => {
		await commit();
		await commit("deleted.txt", "distinct deleted content\n");
		await commit("type.txt");
		await rename(join(root, "source.txt"), join(root, "renamed source.txt"));
		await rm(join(root, "deleted.txt"));
		await rm(join(root, "type.txt"));
		await symlink("renamed source.txt", join(root, "type.txt"));
		await git.add("-A");
		const entries = await changes({ mode: "staged" });
		expect(entries).toEqual(
			expect.arrayContaining([
				{
					status: "renamed",
					previousPath: "source.txt",
					path: "renamed source.txt",
				},
				{ status: "deleted", path: "deleted.txt" },
				{ status: "type-changed", path: "type.txt" },
			]),
		);
	});

	it("retains untracked files even when their paths have staged deletions", async () => {
		await commit();
		await git.rm(["--cached", "source.txt"]);
		expect(await changes({ mode: "local" })).toEqual([
			{ status: "deleted", path: "source.txt" },
			{ status: "added", path: "source.txt" },
		]);
	});

	it("includes changes to tracked ignored files but omits ignored untracked paths", async () => {
		await commit();
		await commit(".gitignore", "source.txt\nignored\n");
		await writeFile(join(root, "source.txt"), "changed");
		await writeFile(join(root, "ignored"), "ignored");
		expect(await changes({ mode: "local" })).toEqual([
			{ status: "modified", path: "source.txt" },
		]);
	});

	it("uses merge base, not target tip or uncommitted changes", async () => {
		await commit();
		await git.checkoutLocalBranch("feature");
		await commit("feature.txt");
		await git.checkout("main");
		await commit("target-only.txt");
		await git.checkout("feature");
		await writeFile(join(root, "source.txt"), "dirty");
		expect(await changes({ base: "main" })).toEqual([
			{ status: "added", path: "feature.txt" },
		]);
	});

	it("resolves explicit base before CI and CI before configured default", async () => {
		await commit();
		vi.stubEnv("GITHUB_BASE_REF", "missing");
		await expect(changes({ defaultBranch: "main" })).rejects.toThrow("missing");
		expect(await changes({ base: "main" })).toEqual([]);
		vi.stubEnv("GITHUB_BASE_REF", "");
		vi.stubEnv("CI_MERGE_REQUEST_TARGET_BRANCH_NAME", "main");
		expect(await changes({ defaultBranch: "missing" })).toEqual([]);
	});

	it("uses configured default or default remote HEAD without assuming main", async () => {
		await commit();
		expect(await changes({ defaultBranch: "main" })).toEqual([]);
		await git.addRemote("origin", root);
		const head = await git.revparse("HEAD");
		await git.raw(["update-ref", "refs/remotes/origin/trunk", head.trim()]);
		await git.raw([
			"symbolic-ref",
			"refs/remotes/origin/HEAD",
			"refs/remotes/origin/trunk",
		]);
		expect(await changes()).toEqual([]);
		expect(await changes({ base: "trunk" })).toEqual([]);
	});

	it("fails on unknown targets, absent target defaults and unrelated history", async () => {
		await commit();
		await expect(changes()).rejects.toThrow("Cannot determine PR target");
		await expect(changes({ base: "missing" })).rejects.toThrow("fetch");
		await git.checkout(["--orphan", "other"]);
		await git.commit("unrelated");
		await expect(changes({ base: "main" })).rejects.toThrow("merge base");
	});

	it("handles unborn local/staged state but requires history for PR mode", async () => {
		await writeFile(join(root, "staged.txt"), "staged");
		await git.add("staged.txt");
		await writeFile(join(root, "untracked.txt"), "untracked");
		expect(await changes({ mode: "staged" })).toEqual([
			{ status: "added", path: "staged.txt" },
		]);
		expect(await changes({ mode: "local" })).toHaveLength(2);
		await expect(changes()).rejects.toThrow("HEAD commit");
	});

	it("rejects conflicts instead of treating them as ordinary changes", async () => {
		await commit();
		await git.checkoutLocalBranch("feature");
		await commit("source.txt", "feature");
		await git.checkout("main");
		await commit("source.txt", "main");
		await expect(git.merge(["feature"])).rejects.toThrow();
		await expect(changes({ mode: "local" })).rejects.toThrow("conflicts");
	});

	it("rejects mode/base conflicts and empty refs", async () => {
		await expect(changes({ mode: "local", base: "main" })).rejects.toThrow(
			"only valid",
		);
		await expect(changes({ base: "" })).rejects.toThrow("nonempty");
	});

	it("reports missing shallow history without switching modes", async () => {
		await commit();
		await git.checkoutLocalBranch("feature");
		await commit("feature.txt");
		const clone = join(root, "clone");
		await mkdir(clone);
		await simpleGit(clone).clone(`file://${root}`, ".", [
			"--depth=1",
			"--branch=feature",
		]);
		await simpleGit(clone).fetch("origin", "main:refs/remotes/origin/main", [
			"--depth=1",
		]);
		await expect(changes({ base: "main" }, clone)).rejects.toThrow("fetch");
	});
});
