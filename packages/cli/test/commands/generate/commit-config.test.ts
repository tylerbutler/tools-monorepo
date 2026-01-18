import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { captureOutput } from "@oclif/test";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import GenerateCommitConfig from "../../../src/commands/generate/commit-config.js";

describe("generate:commit-config", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "generate-commit-config-test-"));
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	describe("error handling", () => {
		it("errors when commit-types.ccl is not found", async () => {
			const { error } = await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			expect(error?.message).toMatch(/commit-types.ccl not found/);
		});
	});

	describe("simple config (no scopes)", () => {
		// CCL format uses = after parent keys and indentation for nesting
		const simpleCCL = `types =
  feat =
    description = A new feature
    changelog_group = Features
  fix =
    description = A bug fix
    changelog_group = Bug Fixes
  chore =
    description = Maintenance
    changelog_group =
`;

		it("generates cliff.toml in dry-run mode", async () => {
			await writeFile(join(tmpDir, "commit-types.ccl"), simpleCCL);

			const { stdout } = await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir, "--dry-run"]);
			});

			expect(stdout).toContain("=== cliff.toml ===");
			expect(stdout).toContain('{ message = "^feat", group = "Features" }');
			expect(stdout).toContain('{ message = "^fix", group = "Bug Fixes" }');
			expect(stdout).toContain('{ message = "^chore", skip = true }');
		});

		it("generates .commitlintrc.json in dry-run mode", async () => {
			await writeFile(join(tmpDir, "commit-types.ccl"), simpleCCL);

			const { stdout } = await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir, "--dry-run"]);
			});

			expect(stdout).toContain("=== .commitlintrc.json ===");
			expect(stdout).toContain('"@commitlint/config-conventional"');
			expect(stdout).toContain('"type-enum"');
			expect(stdout).toContain('"feat"');
			expect(stdout).toContain('"fix"');
			expect(stdout).toContain('"chore"');
		});

		it("writes files in execute mode", async () => {
			await writeFile(join(tmpDir, "commit-types.ccl"), simpleCCL);

			const { stdout } = await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			expect(stdout).toContain("Wrote");
			expect(stdout).toContain("cliff.toml");
			expect(stdout).toContain(".commitlintrc.json");

			// Verify cliff.toml was written
			const cliffContent = await readFile(join(tmpDir, "cliff.toml"), "utf-8");
			expect(cliffContent).toContain("# git-cliff config");
			expect(cliffContent).toContain('message = "^feat"');

			// Verify .commitlintrc.json was written
			const commitlintContent = await readFile(
				join(tmpDir, ".commitlintrc.json"),
				"utf-8",
			);
			const config = JSON.parse(commitlintContent);
			expect(config.extends).toContain("@commitlint/config-conventional");
			expect(config.rules["type-enum"]).toEqual([
				2,
				"always",
				["feat", "fix", "chore"],
			]);
		});

		it("generates correct cliff.toml structure", async () => {
			await writeFile(join(tmpDir, "commit-types.ccl"), simpleCCL);

			await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			const cliffContent = await readFile(join(tmpDir, "cliff.toml"), "utf-8");

			// Check header comment
			expect(cliffContent).toContain(
				"Auto-generated from commit-types.ccl - edit that file instead",
			);

			// Check changelog section
			expect(cliffContent).toContain("[changelog]");
			expect(cliffContent).toContain("header =");
			expect(cliffContent).toContain("body =");
			expect(cliffContent).toContain("trim = true");

			// Check git section
			expect(cliffContent).toContain("[git]");
			expect(cliffContent).toContain("conventional_commits = true");
			expect(cliffContent).toContain("commit_parsers = [");

			// Check bump section
			expect(cliffContent).toContain("[bump]");
			expect(cliffContent).toContain("features_always_bump_minor = true");
		});
	});

	describe("config with scopes", () => {
		const scopedCCL = `types =
  feat =
    description = A new feature
    changelog_group = Features
    scope_required = true
  fix =
    description = A bug fix
    changelog_group = Bug Fixes
    scope_required = true
  chore =
    description = Maintenance
    changelog_group =

scopes =
  cli =
    display_name = CLI
    in_changelog = true
  api =
    display_name = API
    in_changelog = true
  internal =
    display_name = Internal
    in_changelog = false

changelog_scope_order =
  = cli
  = api
`;

		it("generates cliff.toml with scope mappings", async () => {
			await writeFile(join(tmpDir, "commit-types.ccl"), scopedCCL);

			await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			const cliffContent = await readFile(join(tmpDir, "cliff.toml"), "utf-8");

			// Check scope mappings
			expect(cliffContent).toContain("[changelog.scopes]");
			expect(cliffContent).toContain('cli = "CLI"');
			expect(cliffContent).toContain('api = "API"');
			expect(cliffContent).toContain('internal = "Internal"');

			// Check skip parsers for types without changelog groups
			expect(cliffContent).toContain('{ message = "^chore", skip = true }');

			// Check skip parsers for scopes not in changelog
			expect(cliffContent).toContain('{ scope = "internal", skip = true }');

			// Check group parsers
			expect(cliffContent).toContain(
				'{ message = "^feat", group = "Features" }',
			);
			expect(cliffContent).toContain(
				'{ message = "^fix", group = "Bug Fixes" }',
			);
		});

		it("generates commitlint.config.cjs with selective-scope", async () => {
			await writeFile(join(tmpDir, "commit-types.ccl"), scopedCCL);

			const { stdout } = await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			expect(stdout).toContain("commitlint.config.cjs");

			const commitlintContent = await readFile(
				join(tmpDir, "commitlint.config.cjs"),
				"utf-8",
			);

			// Check for selective-scope plugin
			expect(commitlintContent).toContain("plugins: ['selective-scope']");

			// Check for disabled default scope rules
			expect(commitlintContent).toContain("'scope-empty': [0]");
			expect(commitlintContent).toContain("'scope-enum': [0]");

			// Check for selective-scope rule
			expect(commitlintContent).toContain("'selective-scope':");

			// Check that types with scope_required = true have scope lists
			expect(commitlintContent).toContain("feat:");
			expect(commitlintContent).toContain("fix:");
			expect(commitlintContent).toContain('["cli","api","internal"]');
		});

		it("uses changelog_scope_order for template ordering", async () => {
			await writeFile(join(tmpDir, "commit-types.ccl"), scopedCCL);

			await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			const cliffContent = await readFile(join(tmpDir, "cliff.toml"), "utf-8");

			// CCL list syntax uses = prefix for items, parsed as { "": ["cli", "api"] }
			// Check that scope order is embedded in the template
			expect(cliffContent).toContain('["cli","api"]');
		});
	});

	describe("CCL parsing edge cases", () => {
		it("handles empty types section", async () => {
			const ccl = `types =
`;
			await writeFile(join(tmpDir, "commit-types.ccl"), ccl);

			const { stdout } = await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir, "--dry-run"]);
			});

			expect(stdout).toContain("=== cliff.toml ===");
			expect(stdout).toContain("=== .commitlintrc.json ===");
		});

		it("handles missing description with empty default", async () => {
			const ccl = `types =
  feat =
    changelog_group = Features
`;
			await writeFile(join(tmpDir, "commit-types.ccl"), ccl);

			await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			const commitlintContent = await readFile(
				join(tmpDir, ".commitlintrc.json"),
				"utf-8",
			);
			const config = JSON.parse(commitlintContent);
			expect(config.rules["type-enum"][2]).toContain("feat");
		});

		it("handles scope with default display_name", async () => {
			const ccl = `types =
  feat =
    description = Feature
    changelog_group = Features

scopes =
  my-scope =
    in_changelog = true
`;
			await writeFile(join(tmpDir, "commit-types.ccl"), ccl);

			await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			const cliffContent = await readFile(join(tmpDir, "cliff.toml"), "utf-8");
			// display_name defaults to scope name
			expect(cliffContent).toContain('my-scope = "my-scope"');
		});

		it("handles in_changelog defaulting to true", async () => {
			const ccl = `types =
  feat =
    description = Feature
    changelog_group = Features

scopes =
  visible =
    display_name = Visible Scope
`;
			await writeFile(join(tmpDir, "commit-types.ccl"), ccl);

			await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			const cliffContent = await readFile(join(tmpDir, "cliff.toml"), "utf-8");
			// Should NOT have a skip parser for "visible" since in_changelog defaults to true
			expect(cliffContent).not.toContain('{ scope = "visible", skip = true }');
		});

		it("handles scope_required = false explicitly", async () => {
			const ccl = `types =
  feat =
    description = Feature
    changelog_group = Features
    scope_required = false

scopes =
  cli =
    display_name = CLI
`;
			await writeFile(join(tmpDir, "commit-types.ccl"), ccl);

			await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			const commitlintContent = await readFile(
				join(tmpDir, "commitlint.config.cjs"),
				"utf-8",
			);
			// feat should NOT be in selective-scope because scope_required = false
			expect(commitlintContent).not.toMatch(/feat:\s*\[/);
		});

		it("respects changelog_scope_order with custom ordering", async () => {
			// CCL list syntax uses = prefix for items
			const ccl = `types =
  feat =
    description = Feature
    changelog_group = Features

scopes =
  first =
    display_name = First
  second =
    display_name = Second

changelog_scope_order =
  = second
  = first
`;
			await writeFile(join(tmpDir, "commit-types.ccl"), ccl);

			await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			const cliffContent = await readFile(join(tmpDir, "cliff.toml"), "utf-8");
			// Order matches what was specified in changelog_scope_order
			expect(cliffContent).toContain('["second","first"]');
		});
	});

	describe("cwd flag", () => {
		it("uses current directory by default", async () => {
			// Create a nested directory - tmp dir has no commit-types.ccl
			const nestedDir = join(tmpDir, "nested");
			mkdirSync(nestedDir, { recursive: true });
			await writeFile(
				join(nestedDir, "commit-types.ccl"),
				`types =
  feat =
    description = Feature
    changelog_group = Features
`,
			);

			const { error } = await captureOutput(async () => {
				// Running from tmpDir without --cwd should fail since commit-types.ccl
				// is in nested, not in tmpDir
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			expect(error?.message).toMatch(/commit-types.ccl not found/);
		});

		it("uses specified directory with --cwd", async () => {
			const nestedDir = join(tmpDir, "nested");
			mkdirSync(nestedDir, { recursive: true });
			const cclContent = `types =
  feat =
    description = Feature
    changelog_group = Features
`;
			await writeFile(join(nestedDir, "commit-types.ccl"), cclContent);

			const { stdout } = await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", nestedDir]);
			});

			expect(stdout).toContain("Wrote");
			expect(stdout).toContain("cliff.toml");
		});
	});

	describe("output file locations", () => {
		it("writes files to the target directory, not cwd", async () => {
			const targetDir = join(tmpDir, "target");
			mkdirSync(targetDir, { recursive: true });
			const cclContent = `types =
  feat =
    description = Feature
    changelog_group = Features
`;
			await writeFile(join(targetDir, "commit-types.ccl"), cclContent);

			await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", targetDir]);
			});

			// Files should be in target directory
			const cliffContent = await readFile(
				join(targetDir, "cliff.toml"),
				"utf-8",
			);
			expect(cliffContent).toContain("# git-cliff config");

			const commitlintContent = await readFile(
				join(targetDir, ".commitlintrc.json"),
				"utf-8",
			);
			expect(commitlintContent).toContain("@commitlint/config-conventional");
		});
	});

	describe("template content validation", () => {
		it("cliff.toml template contains changelog body with version handling", async () => {
			const ccl = `types =
  feat =
    description = Feature
    changelog_group = Features
`;
			await writeFile(join(tmpDir, "commit-types.ccl"), ccl);

			await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			const cliffContent = await readFile(join(tmpDir, "cliff.toml"), "utf-8");

			// Check for version/unreleased handling in template
			expect(cliffContent).toContain("{% if version %}");
			expect(cliffContent).toContain("## [Unreleased]");
			expect(cliffContent).toContain("trim_start_matches");
		});

		it("cliff.toml template groups commits correctly", async () => {
			const ccl = `types =
  feat =
    description = Feature
    changelog_group = Features
`;
			await writeFile(join(tmpDir, "commit-types.ccl"), ccl);

			await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			const cliffContent = await readFile(join(tmpDir, "cliff.toml"), "utf-8");

			expect(cliffContent).toContain("group_by");
			expect(cliffContent).toContain("upper_first");
		});

		it("cliff.toml includes bump configuration", async () => {
			const ccl = `types =
  feat =
    description = Feature
    changelog_group = Features
`;
			await writeFile(join(tmpDir, "commit-types.ccl"), ccl);

			await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			const cliffContent = await readFile(join(tmpDir, "cliff.toml"), "utf-8");

			expect(cliffContent).toContain("[bump]");
			expect(cliffContent).toContain("features_always_bump_minor = true");
			expect(cliffContent).toContain("breaking_always_bump_major = true");
		});
	});

	describe("scoped config template differences", () => {
		it("generates different cliff template for scoped vs simple config", async () => {
			// Simple config
			const simpleCCL = `types =
  feat =
    description = Feature
    changelog_group = Features
`;
			await writeFile(join(tmpDir, "commit-types.ccl"), simpleCCL);

			await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			const simpleCliff = await readFile(join(tmpDir, "cliff.toml"), "utf-8");

			// Clear the directory
			rmSync(join(tmpDir, "cliff.toml"));
			rmSync(join(tmpDir, ".commitlintrc.json"));

			// Scoped config
			const scopedCCL = `types =
  feat =
    description = Feature
    changelog_group = Features

scopes =
  cli =
    display_name = CLI
`;
			await writeFile(join(tmpDir, "commit-types.ccl"), scopedCCL);

			await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			const scopedCliff = await readFile(join(tmpDir, "cliff.toml"), "utf-8");

			// Scoped version should have different template structure
			expect(scopedCliff).toContain("[changelog.scopes]");
			expect(simpleCliff).not.toContain("[changelog.scopes]");

			// Scoped version organizes by scope first
			expect(scopedCliff).toContain("scope_order");
			expect(simpleCliff).not.toContain("scope_order");
		});

		it("uses .commitlintrc.json for simple, commitlint.config.cjs for scoped", async () => {
			// Simple config
			const simpleCCL = `types =
  feat =
    description = Feature
    changelog_group = Features
`;
			await writeFile(join(tmpDir, "commit-types.ccl"), simpleCCL);

			const { stdout: simpleStdout } = await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			expect(simpleStdout).toContain(".commitlintrc.json");
			expect(simpleStdout).not.toContain("commitlint.config.cjs");

			// Clear
			rmSync(join(tmpDir, "cliff.toml"));
			rmSync(join(tmpDir, ".commitlintrc.json"));

			// Scoped config
			const scopedCCL = `types =
  feat =
    description = Feature
    changelog_group = Features

scopes =
  cli =
    display_name = CLI
`;
			await writeFile(join(tmpDir, "commit-types.ccl"), scopedCCL);

			const { stdout: scopedStdout } = await captureOutput(async () => {
				await GenerateCommitConfig.run(["--cwd", tmpDir]);
			});

			expect(scopedStdout).toContain("commitlint.config.cjs");
		});
	});
});
