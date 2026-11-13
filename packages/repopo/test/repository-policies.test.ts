import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { describe, expect, it, onTestFinished } from "vitest";
import config from "../../../repopo.config.js";
import { runPolicies } from "../src/runner.js";

const repositoryPolicies = config.policies;
if (!repositoryPolicies) {
	throw new Error("Repository policies must be configured");
}

describe("repository architecture policies", () => {
	it("rejects package project.json files with migration guidance but leaves canonical and vendored files alone", async () => {
		const policy = repositoryPolicies.find(
			(candidate) => candidate.name === "NoPackageProjectJson",
		);
		if (!policy) {
			throw new Error("NoPackageProjectJson must be configured");
		}
		const results = await runPolicies({
			root: "/repo",
			fix: true,
			policies: [policy],
			files: [
				"packages/example/project.json",
				"packages/group/example/project.json",
				"packages/example/package.json",
				"packages/example/not-project.json",
				"packages/btree-typescript/project.json",
				"nx.json",
			],
		});
		expect(results.errors).toEqual([]);
		expect(results.findings.map((finding) => finding.file)).toEqual([
			"packages/example/project.json",
			"packages/group/example/project.json",
		]);
		for (const finding of results.findings) {
			expect(finding).toMatchObject({
				message: expect.stringContaining("competing locations"),
				manualFix: expect.stringContaining(
					"Preserve required tasks and caching",
				),
			});
			expect(finding.manualFix).toContain(
				"packages/repopo/package.json and nx.json",
			);
			expect(finding.fixStatus).not.toBe("fixed");
		}
	});

	it("exempts only the required tree-sitter grammar filename from the JavaScript extension policy", async () => {
		const results = await runPolicies({
			root: "/repo",
			fix: false,
			policies: repositoryPolicies.filter(
				(candidate) => candidate.name === "NoJsFileExtensions",
			),
			files: [
				"packages/tree-sitter-ccl/grammar.js",
				"packages/tree-sitter-ccl/bindings/node/index.cjs",
				"packages/tree-sitter-ccl/bindings/node/index.js",
				"packages/tree-sitter-ccl-extra/grammar.js",
			],
		});

		expect(results.errors).toEqual([]);
		expect(results.findings.map((finding) => finding.file)).toEqual([
			"packages/tree-sitter-ccl/bindings/node/index.js",
			"packages/tree-sitter-ccl-extra/grammar.js",
		]);
	});

	it("exempts the native grammar from coverage requirements but still requires maintenance scripts", async () => {
		const root = mkdtempSync(join(tmpdir(), "repopo-native-grammar-"));
		onTestFinished(() => {
			rmSync(root, { recursive: true, force: true });
		});
		const scripts = {
			clean: "rimraf build",
			"release:license": "generate-license-file",
			test: "tree-sitter test",
		};
		const files = [
			"packages/tree-sitter-ccl/package.json",
			"packages/tree-sitter-ccl-extra/package.json",
		];
		for (const name of ["tree-sitter-ccl", "tree-sitter-ccl-extra"]) {
			const packageDir = join(root, "packages", name);
			mkdirSync(join(packageDir, "test"), { recursive: true });
			writeFileSync(
				join(packageDir, "package.json"),
				JSON.stringify({ name, scripts }),
			);
		}
		const policies = repositoryPolicies.filter(
			(candidate) =>
				candidate.name === "PackageScripts" ||
				candidate.name === "PackageTestScripts",
		);
		const results = await runPolicies({
			root,
			fix: false,
			policies,
			files,
		});

		expect(results.errors).toEqual([]);
		expect(results.findings).toHaveLength(2);
		for (const finding of results.findings) {
			expect(finding.file).toBe("packages/tree-sitter-ccl-extra/package.json");
			expect(finding.message).toContain("test:coverage");
		}

		writeFileSync(
			join(root, "packages/tree-sitter-ccl/package.json"),
			JSON.stringify({
				name: "tree-sitter-ccl",
				scripts: { clean: scripts.clean, test: scripts.test },
			}),
		);
		const missingLicense = await runPolicies({
			root,
			fix: false,
			policies,
			files: ["packages/tree-sitter-ccl/package.json"],
		});

		expect(missingLicense.errors).toEqual([]);
		expect(missingLicense.findings).toEqual([
			expect.objectContaining({
				file: "packages/tree-sitter-ccl/package.json",
				policy: "PackageScripts",
				message: expect.stringContaining("release:license"),
			}),
		]);
	});
});
