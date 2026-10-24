import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { run } from "effection";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makePolicy } from "../../src/makePolicy.js";
import { LicenseFileExists } from "../../src/policies/LicenseFileExists.js";
import { PolicyRunner } from "../../src/runner.js";

describe("LicenseFileExists", () => {
	let root: string;

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), "repopo-license-"));
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	it.each([
		"LICENSE",
		"LICENSE.txt",
		"LICENSE.md",
		"LICENSE.rst",
		"LICENCE",
		"LICENCE.txt",
		"LICENCE.md",
		"LICENCE.rst",
	])("accepts %s without a package.json anchor", async (name) => {
		await writeFile(join(root, name), "License content");
		expect(
			await LicenseFileExists.handler({
				root,
				files: [name],
				resolve: false,
			}),
		).toEqual([]);
	});

	it("reports a repository finding even with no selected files or inventory", async () => {
		const runner = new PolicyRunner({
			root,
			inventory: [],
			files: [],
			policies: [makePolicy(LicenseFileExists)],
			fix: true,
		});
		const result = await run(() => runner.run());
		expect(result.findings).toEqual([
			{
				scope: "repository",
				policy: "LicenseFileExists",
				policyId: "LicenseFileExists",
				message: expect.stringContaining("No LICENSE file found"),
			},
		]);
	});

	it("accepts configured names and ignores files outside the eligible inventory", async () => {
		await writeFile(join(root, "COPYING"), "License content");
		const args = {
			root,
			files: ["COPYING"],
			resolve: false,
			config: { acceptedNames: ["COPYING"] },
		};
		expect(await LicenseFileExists.handler(args)).toEqual([]);
		expect(await LicenseFileExists.handler({ ...args, files: [] })).toEqual([
			expect.objectContaining({ message: expect.stringContaining("COPYING") }),
		]);
	});

	it("does not accept a directory or a deleted tracked file as a license", async () => {
		await mkdir(join(root, "LICENSE"));
		expect(
			await LicenseFileExists.handler({
				root,
				files: ["LICENSE", "LICENSE.txt"],
				resolve: false,
			}),
		).toEqual([
			expect.objectContaining({
				message: expect.stringContaining("No LICENSE file found"),
			}),
		]);
	});
});
