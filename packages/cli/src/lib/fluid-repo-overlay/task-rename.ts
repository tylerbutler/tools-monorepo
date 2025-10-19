/**
 * Core logic for renaming package.json scripts to follow three-tier naming principles
 */

import { access, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { Logger } from "@tylerbu/cli-api";
import { glob } from "tinyglobby";

// ============================================================================
// Types
// ============================================================================

export interface RenameRule {
	/** Pattern to match (string for exact match, RegExp for pattern) */
	pattern: string | RegExp;
	/** Replacement name */
	replacement: string;
	/** Optional condition function */
	condition?: (scriptContent: string) => boolean;
	/** Target tier (1=workflow, 2=stage, 3=executor) */
	tier: 1 | 2 | 3;
	/** Reason for rename */
	reason: string;
}

export interface TaskRenameOptions {
	/** Path to repository root */
	repoDir: string;
	/** Skip cross-reference updates */
	skipCrossRefs: boolean;
	/** Dry run mode */
	dryRun: boolean;
}

export interface RenameEntry {
	from: string;
	to: string;
	packagePath: string;
	tier: number;
	reason: string;
}

export interface TaskAnalysis {
	totalPackages: number;
	totalScripts: number;
	issues: string[];
	renames: RenameEntry[];
	crossRefUpdates: number;
}

export interface TaskRenameResult {
	packagesModified: number;
	scriptsRenamed: number;
	crossRefsUpdated: number;
	filesModified: number;
}

export interface ValidationCheck {
	name: string;
	passed: boolean;
	details?: string;
}

export interface TaskValidation {
	allPassed: boolean;
	checks: ValidationCheck[];
}

interface PackageJson {
	[key: string]: unknown;
	name?: string;
	scripts?: Record<string, string>;
	fluidBuild?: {
		tasks?: Record<string, unknown>;
		[key: string]: unknown;
	};
}

// ============================================================================
// Rename Rules
// ============================================================================

const RENAME_RULES: RenameRule[] = [
	// ========================================================================
	// Initial Rules (Phase 1)
	// ========================================================================
	{
		pattern: "build:esnext:experimental",
		replacement: "esnext-experimental",
		tier: 3,
		reason: "Executor: Semantic executor for experimental ESM compilation (Pattern A with dash-separated variant)",
	},
	{
		pattern: "build:esnext:main",
		replacement: "esnext-main",
		tier: 3,
		reason: "Executor: Semantic executor for main entry point ESM compilation (Pattern A with dash-separated variant)",
	},
	{
		pattern: "build:esnext",
		replacement: "esnext",
		tier: 3,
		reason: "Executor: Semantic executor for ESM compilation (Pattern A, strict rules - 99.4% executor)",
	},
	{
		pattern: "format-and-build",
		replacement: "build:format-first",
		tier: 2,
		reason: "Orchestrator: Tier 2 stage orchestrator coordinating format then build (single colon for stage)",
	},
	{
		pattern: "format-and-compile",
		replacement: "compile:format-first",
		tier: 2,
		reason: "Orchestrator: Tier 2 stage orchestrator coordinating format then compile (single colon for stage)",
	},

	// ========================================================================
	// Reverse Renames (Corrections from Phase 1)
	// ========================================================================
	// The build L1 orchestrator should build everything (source + tests).
	// The test L1 orchestrator should run tests (assumes already built).
	{
		pattern: "test:build",
		replacement: "build:test",
		tier: 2,
		reason: "Orchestrator: Tier 2 stage orchestrator for test building, called by build workflow (not test workflow)",
	},
	{
		pattern: "test:build:cjs",
		replacement: "build:test:cjs",
		tier: 2,
		reason: "Orchestrator: Tier 2 stage orchestrator for CJS test building",
	},
	{
		pattern: "test:build:esm",
		replacement: "build:test:esm",
		tier: 2,
		reason: "Orchestrator: Tier 2 stage orchestrator for ESM test building",
	},

	// ========================================================================
	// Category A: Documentation Generation
	// ========================================================================
	{
		pattern: "build:docs",
		replacement: "api-extractor",
		tier: 3,
		reason: "Executor: Direct tool executor running api-extractor (Pattern A)",
	},
	{
		pattern: "build:api-reports:current",
		replacement: "api-reports-current",
		tier: 3,
		reason: "Executor: Semantic executor for API reports generation (Pattern A with dash-separated variant for current API level)",
	},
	{
		pattern: "build:api-reports:legacy",
		replacement: "api-reports-legacy",
		tier: 3,
		reason: "Executor: Semantic executor for API reports generation (Pattern A with dash-separated variant for legacy API level)",
	},
	{
		pattern: "build:api-reports:browser:current",
		replacement: "api-reports-browser-current",
		tier: 3,
		reason: "Executor: Semantic executor for browser API reports (Pattern A with dash-separated variant for browser/current)",
	},
	{
		pattern: "build:api-reports:browser:legacy",
		replacement: "api-reports-browser-legacy",
		tier: 3,
		reason: "Executor: Semantic executor for browser API reports (Pattern A with dash-separated variant for browser/legacy)",
	},

	// ========================================================================
	// Category B: File Operations
	// ========================================================================
	{
		pattern: "build:copy",
		replacement: "copyfiles",
		tier: 3,
		reason: "Executor: Direct tool executor running copyfiles (Pattern A)",
	},
	{
		pattern: "build:genver",
		replacement: "generate-version",
		tier: 3,
		reason: "Executor: Semantic executor for version generation using gen-version tool (Pattern A)",
	},

	// ========================================================================
	// Category C: Test Infrastructure
	// ========================================================================
	// Note: build:test:cjs and build:test:esm compile test files (not run tests)
	{
		pattern: "test:jest:verbose",
		replacement: "jest:verbose",
		tier: 3,
		reason: "Executor: Jest test runner with verbose output (Pattern C tool variant)",
	},
	{
		pattern: "test:coverage",
		replacement: "coverage",
		tier: 3,
		reason: "Executor: Semantic executor for testing with coverage (Pattern A, strict rules)",
	},
	{
		pattern: "build:test",
		replacement: "tsc-test",
		tier: 3,
		reason: "Executor: Semantic executor for TypeScript test compilation (Pattern A with conditional classification)",
		condition: (content: string) =>
			content.includes("tsc") && !content.includes("npm run") && !content.includes("&&"),
	},
	{
		pattern: "build:test:cjs",
		replacement: "tsc-test-cjs",
		tier: 3,
		reason: "Executor: Semantic executor for CJS test compilation (Pattern A with dash-separated variant)",
	},
	{
		pattern: "build:test:esm",
		replacement: "tsc-test-esm",
		tier: 3,
		reason: "Executor: Semantic executor for ESM test compilation (Pattern A with dash-separated variant)",
	},
	{
		pattern: "build:test:esm:no-exactOptionalPropertyTypes",
		replacement: "tsc-test-esm-no-exactOptionalPropertyTypes",
		tier: 3,
		reason: "Executor: Semantic executor for ESM test compilation without exactOptionalPropertyTypes (Pattern A)",
	},
	{
		pattern: "build:test:types",
		replacement: "tsc-test-types",
		tier: 3,
		reason: "Executor: Semantic executor for test type definition compilation (Pattern A with dash-separated variant)",
	},
	{
		pattern: "build:test:mocha:cjs",
		replacement: "tsc-test-mocha-cjs",
		tier: 3,
		reason: "Executor: Semantic executor for CJS mocha test compilation (Pattern A with dash-separated variant)",
	},
	{
		pattern: "build:test:mocha:esm",
		replacement: "tsc-test-mocha-esm",
		tier: 3,
		reason: "Executor: Semantic executor for ESM mocha test compilation (Pattern A with dash-separated variant)",
	},
	{
		pattern: "build:test:jest",
		replacement: "jest",
		tier: 3,
		reason: "Executor: Direct tool executor running jest (Pattern A)",
	},

	// ========================================================================
	// Category D: Export Generation
	// ========================================================================
	{
		pattern: "build:exports:browser",
		replacement: "generate-exports-browser",
		tier: 3,
		reason: "Executor: Semantic executor for browser export generation using flub (Pattern A with dash-separated multi-word name)",
	},
	{
		pattern: "build:exports:node",
		replacement: "generate-exports-node",
		tier: 3,
		reason: "Executor: Semantic executor for Node.js export generation using flub (Pattern A with dash-separated multi-word name)",
	},

	// ========================================================================
	// Category E: Entrypoint Generation
	// ========================================================================
	{
		pattern: "api-extractor:commonjs",
		replacement: "generate-entrypoints-commonjs",
		tier: 3,
		reason: "Executor: Semantic executor for CommonJS entrypoint generation using flub (Pattern A with dash-separated multi-word name)",
	},
	{
		pattern: "api-extractor:esnext",
		replacement: "generate-entrypoints-esnext",
		tier: 3,
		reason: "Executor: Semantic executor for ESNext entrypoint generation using flub (Pattern A with dash-separated multi-word name)",
	},

	// ========================================================================
	// Category F: check: Prefix Executors
	// ========================================================================
	{
		pattern: "check:biome",
		replacement: "biome-check",
		tier: 3,
		reason: "Executor: Semantic executor for Biome formatting/linting check (Pattern A with dash-separated multi-word name)",
	},
	{
		pattern: "check:are-the-types-wrong",
		replacement: "attw",
		tier: 3,
		reason: "Executor: Direct tool executor running are-the-types-wrong (Pattern A with abbreviated tool name)",
	},
	{
		pattern: "check:exports:bundle-release-tags",
		replacement: "api-extractor-exports-bundle-release-tags",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for bundle release tag validation (Pattern A)",
	},
	{
		pattern: "check:exports:cjs:public",
		replacement: "api-extractor-exports-cjs-public",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for CJS public exports validation (Pattern A)",
	},
	{
		pattern: "check:exports:esm:public",
		replacement: "api-extractor-exports-esm-public",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for ESM public exports validation (Pattern A)",
	},
	{
		pattern: "check:exports:cjs:legacy",
		replacement: "api-extractor-exports-cjs-legacy",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for CJS legacy exports validation (Pattern A)",
	},
	{
		pattern: "check:exports:esm:legacy",
		replacement: "api-extractor-exports-esm-legacy",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for ESM legacy exports validation (Pattern A)",
	},
	{
		pattern: "check:exports:cjs:index",
		replacement: "api-extractor-exports-cjs-index",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for CJS index exports validation (Pattern A)",
	},
	{
		pattern: "check:exports:esm:index",
		replacement: "api-extractor-exports-esm-index",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for ESM index exports validation (Pattern A)",
	},
	{
		pattern: "check:exports:cjs:alpha",
		replacement: "api-extractor-exports-cjs-alpha",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for CJS alpha exports validation (Pattern A)",
	},
	{
		pattern: "check:exports:esm:alpha",
		replacement: "api-extractor-exports-esm-alpha",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for ESM alpha exports validation (Pattern A)",
	},
	{
		pattern: "check:exports:cjs:beta",
		replacement: "api-extractor-exports-cjs-beta",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for CJS beta exports validation (Pattern A)",
	},
	{
		pattern: "check:exports:esm:beta",
		replacement: "api-extractor-exports-esm-beta",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for ESM beta exports validation (Pattern A)",
	},
	{
		pattern: "check:release-tags",
		replacement: "api-extractor-release-tags",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for release tag validation (Pattern A)",
	},

	// ========================================================================
	// Category G: ci: Prefix Executors
	// ========================================================================
	{
		pattern: "ci:build:docs",
		replacement: "api-extractor-ci-docs",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for CI documentation generation (Pattern A)",
	},
	{
		pattern: "ci:build:api-reports:current",
		replacement: "api-extractor-ci-api-reports-current",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for CI API reports current level (Pattern A)",
	},
	{
		pattern: "ci:build:api-reports:legacy",
		replacement: "api-extractor-ci-api-reports-legacy",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for CI API reports legacy level (Pattern A)",
	},
	{
		pattern: "ci:build:api-reports:browser:current",
		replacement: "api-extractor-ci-api-reports-browser-current",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for CI browser variant current level (Pattern A)",
	},
	{
		pattern: "ci:build:api-reports:browser:legacy",
		replacement: "api-extractor-ci-api-reports-browser-legacy",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for CI browser variant legacy level (Pattern A)",
	},
	{
		pattern: "ci:build:api-reports:node:current",
		replacement: "api-extractor-ci-api-reports-node-current",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for CI Node.js variant current level (Pattern A)",
	},
	{
		pattern: "ci:build:api-reports:node:legacy",
		replacement: "api-extractor-ci-api-reports-node-legacy",
		tier: 3,
		reason: "Executor: Semantic executor running api-extractor for CI Node.js variant legacy level (Pattern A)",
	},

	// ========================================================================
	// Category H: format: Prefix Executors
	// ========================================================================
	{
		pattern: "format:biome",
		replacement: "biome-format",
		tier: 3,
		reason: "Executor: Semantic executor for Biome formatting with write mode (Pattern A with dash-separated multi-word name)",
	},
];

// Scripts that should be ignored (will be removed in Phase 2)
const IGNORE_SCRIPTS = [
	"api", // Calls fluid-build
	"build", // Calls fluid-build
	"lint", // Calls fluid-build
	"test", // May call fluid-build
];

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Analyze repository for task naming issues and rename opportunities
 */
export async function analyzeTaskNaming(
	repoDir: string,
	logger: Logger,
): Promise<TaskAnalysis> {
	const packages = await findPackages(repoDir);
	const renames: RenameEntry[] = [];
	const issues: string[] = [];
	let totalScripts = 0;
	let crossRefUpdates = 0;

	for (const packagePath of packages) {
		const content = await readFile(packagePath, "utf-8");
		const pkg: PackageJson = JSON.parse(content);

		if (!pkg.scripts) {
			continue;
		}

		totalScripts += Object.keys(pkg.scripts).length;

		// Check each script against rename rules
		for (const [scriptName, scriptContent] of Object.entries(pkg.scripts)) {
			// Skip ignored scripts
			if (IGNORE_SCRIPTS.includes(scriptName)) {
				continue;
			}

			// Check if script matches any rename rule
			for (const rule of RENAME_RULES) {
				const matches =
					typeof rule.pattern === "string"
						? rule.pattern === scriptName
						: rule.pattern.test(scriptName);

				if (
					matches &&
					(!rule.condition || rule.condition(scriptContent as string))
				) {
					renames.push({
						from: scriptName,
						to: rule.replacement,
						packagePath,
						tier: rule.tier,
						reason: rule.reason,
					});

					// Check if other scripts reference this one
					const referencingScripts = findScriptReferences(
						pkg.scripts,
						scriptName,
					);
					crossRefUpdates += referencingScripts.length;
					break;
				}
			}

			// Check for naming issues (executors with build: prefix)
			if (scriptName.startsWith("build:") && looksLikeExecutor(scriptContent as string)) {
				const suggested = scriptName.replace(/^build:/, "");
				if (!renames.some((r) => r.from === scriptName)) {
					issues.push(
						`${pkg.name}: "${scriptName}" appears to be executor but has build: prefix (suggest: "${suggested}")`,
					);
				}
			}
		}
	}

	return {
		totalPackages: packages.length,
		totalScripts,
		issues,
		renames,
		crossRefUpdates,
	};
}

/**
 * Apply task renames to repository
 */
export async function applyTaskRenames(
	options: TaskRenameOptions,
	logger: Logger,
): Promise<TaskRenameResult> {
	const packages = await findPackages(options.repoDir);
	let packagesModified = 0;
	let scriptsRenamed = 0;
	let crossRefsUpdated = 0;

	// Build rename maps for efficient lookup
	const renameMap = new Map<string, string>(); // All renames (including conditional)
	const unconditionalRenameMap = new Map<string, string>(); // Only unconditional renames
	for (const rule of RENAME_RULES) {
		if (typeof rule.pattern === "string") {
			renameMap.set(rule.pattern, rule.replacement);
			if (!rule.condition) {
				unconditionalRenameMap.set(rule.pattern, rule.replacement);
			}
		}
	}

	for (const packagePath of packages) {
		const content = await readFile(packagePath, "utf-8");
		const pkg: PackageJson = JSON.parse(content);

		if (!pkg.scripts) {
			continue;
		}

		let modified = false;
		const newScripts: Record<string, string> = {};

		// First pass: rename script keys
		for (const [scriptName, scriptContent] of Object.entries(pkg.scripts)) {
			let newName = scriptName;

			// Check if this script should be renamed
			for (const rule of RENAME_RULES) {
				const matches =
					typeof rule.pattern === "string"
						? rule.pattern === scriptName
						: rule.pattern.test(scriptName);

				if (
					matches &&
					(!rule.condition || rule.condition(scriptContent as string))
				) {
					newName = rule.replacement;
					scriptsRenamed++;
					modified = true;
					break;
				}
			}

			newScripts[newName] = scriptContent as string;
		}

		// Second pass: update cross-references (if not skipped)
		if (!options.skipCrossRefs) {
			for (const [scriptName, scriptContent] of Object.entries(newScripts)) {
				const updatedContent = updateScriptReferences(scriptContent, renameMap);
				if (updatedContent !== scriptContent) {
					newScripts[scriptName] = updatedContent;
					crossRefsUpdated++;
					modified = true;
				}
			}
		}

		// Third pass: handle fluidBuild.tasks if present
		if (pkg.fluidBuild?.tasks && Object.keys(pkg.fluidBuild.tasks).length > 0) {
			const newTasks: Record<string, unknown> = {};

			for (const [taskName, taskDeps] of Object.entries(pkg.fluidBuild.tasks)) {
				let newTaskName = taskName;

				// Only rename fluidBuild.tasks keys if the corresponding script was renamed
				// Check if this taskName existed as a script and was renamed
				if (pkg.scripts?.[taskName]) {
					// Find the new name in newScripts
					const wasRenamed = !newScripts[taskName]; // If old name doesn't exist in newScripts, it was renamed
					if (wasRenamed) {
						// Find what it was renamed to
						for (const [scriptName] of Object.entries(newScripts)) {
							// Check if this script was the renamed version of our taskName
							for (const rule of RENAME_RULES) {
								const matches =
									typeof rule.pattern === "string"
										? rule.pattern === taskName
										: rule.pattern.test(taskName);

								if (
									matches &&
									scriptName === rule.replacement &&
									(!rule.condition ||
										rule.condition(pkg.scripts[taskName] as string))
								) {
									newTaskName = rule.replacement;
									modified = true;
									break;
								}
							}
							if (newTaskName !== taskName) break;
						}
					}
				}

				// Update task dependencies if not skipped
				if (!options.skipCrossRefs && Array.isArray(taskDeps)) {
					const updatedDeps = taskDeps.map((dep) => {
						if (typeof dep === "string") {
							const updatedDep = updateFluidBuildReference(
								dep,
								renameMap,
								unconditionalRenameMap,
							);
							if (updatedDep !== dep) {
								crossRefsUpdated++;
								modified = true;
							}
							return updatedDep;
						}
						return dep;
					});
					newTasks[newTaskName] = updatedDeps;
				} else {
					newTasks[newTaskName] = taskDeps;
				}
			}

			// Only update if we actually have the fluidBuild.tasks property originally
			pkg.fluidBuild.tasks = newTasks;
		}

		// Write back if modified
		if (modified) {
			pkg.scripts = newScripts;

			// Only write back the package.json as-is, don't add fields that weren't there
			await writeFile(
				packagePath,
				`${JSON.stringify(pkg, null, 2)}\n`,
				"utf-8",
			);
			packagesModified++;

			const relativePath = relative(options.repoDir, packagePath);
			logger.log(`  ✏️  Modified: ${relativePath}`);
		}
	}

	return {
		packagesModified,
		scriptsRenamed,
		crossRefsUpdated,
		filesModified: packagesModified,
	};
}

/**
 * Update the root-level fluidBuild.config.cjs file with renamed task names
 */
export async function updateFluidBuildConfig(
	repoDir: string,
	renameMap: Map<string, string>,
	logger: Logger,
): Promise<void> {
	const configPath = join(repoDir, "fluidBuild.config.cjs");

	// Check if file exists
	try {
		await access(configPath);
	} catch {
		logger.log("  ℹ️  No fluidBuild.config.cjs found - skipping");
		return;
	}

	// Read the file
	let content = await readFile(configPath, "utf-8");
	const originalContent = content;

	// Update tscDependsOn constant
	for (const [oldName, newName] of renameMap.entries()) {
		// Match in the tscDependsOn array: ["^tsc", "^api", "build:genver", "ts2esm"]
		const constPattern = new RegExp(`(\\[.*?)"${oldName}"(.*?\\])`, "g");
		content = content.replace(constPattern, `$1"${newName}"$2`);

		// Match as task definition key: "build:genver": []
		const taskKeyPattern = new RegExp(`^(\\s*)"${oldName}"(\\s*:)`, "gm");
		content = content.replace(taskKeyPattern, `$1"${newName}"$2`);

		// Match in dependsOn arrays: ["typetests:gen", "tsc", "build:genver"]
		const depPattern = new RegExp(`"${oldName}"`, "g");
		content = content.replace(depPattern, `"${newName}"`);
	}

	// Write back if modified
	if (content !== originalContent) {
		await writeFile(configPath, content, "utf-8");
		logger.log("  ✏️  Modified: fluidBuild.config.cjs");
	}
}

/**
 * Update the fluidBuild.config.cjs to disable fluid-build-tasks-* and npm-package-exports-apis-linted policies
 * These policies will try to re-add tasks with incorrect names after renaming
 */
export async function disableFluidBuildTasksPolicies(
	repoDir: string,
	logger: Logger,
): Promise<void> {
	const configPath = join(repoDir, "fluidBuild.config.cjs");

	// Check if file exists
	try {
		await access(configPath);
	} catch {
		logger.log("  ℹ️  No fluidBuild.config.cjs found - skipping policy updates");
		return;
	}

	// Read the file
	let content = await readFile(configPath, "utf-8");
	const originalContent = content;

	// Find the handlerExclusions section and disable relevant policies
	// We want to replace the array contents with [".*"] to exclude all packages
	const policyHandlers = [
		"fluid-build-tasks-eslint",
		"fluid-build-tasks-tsc",
		"npm-package-exports-apis-linted",
	];

	for (const handler of policyHandlers) {
		// Pattern to match: "fluid-build-tasks-eslint": [ ... ],
		// We'll replace the array contents with [".*"]
		const handlerPattern = new RegExp(
			`("${handler}"\\s*:\\s*\\[)([^\\]]*)(\\])`,
			"s"
		);

		const match = content.match(handlerPattern);
		if (match) {
			// Replace the array contents with [".*"] to exclude all packages
			content = content.replace(
				handlerPattern,
				`$1\n\t\t\t\t// Disabled by task-rename: policies will add tasks with incorrect names\n\t\t\t\t".*",\n\t\t\t$3`
			);
		}
	}

	// Write back if modified
	if (content !== originalContent) {
		await writeFile(configPath, content, "utf-8");
		logger.log("  ✏️  Disabled fluid-build-tasks-* and npm-package-exports-apis-linted policies in fluidBuild.config.cjs");
	}
}

/**
 * Validate that renames were applied correctly
 */
export async function validateTaskRenames(
	repoDir: string,
	logger: Logger,
): Promise<TaskValidation> {
	const checks: ValidationCheck[] = [];
	const packages = await findPackages(repoDir);

	// Check 1: No orphaned references
	let orphanedRefs = 0;
	for (const packagePath of packages) {
		const content = await readFile(packagePath, "utf-8");
		const pkg: PackageJson = JSON.parse(content);

		if (!pkg.scripts) {
			continue;
		}

		const scriptNames = Object.keys(pkg.scripts);
		for (const scriptContent of Object.values(pkg.scripts)) {
			const references = extractScriptReferences(scriptContent as string);
			for (const ref of references) {
				if (!scriptNames.includes(ref) && !IGNORE_SCRIPTS.includes(ref)) {
					orphanedRefs++;
				}
			}
		}
	}

	const check1: ValidationCheck = {
		name: "No orphaned references",
		passed: orphanedRefs === 0,
	};
	if (orphanedRefs > 0) {
		check1.details = `Found ${orphanedRefs} orphaned references`;
	}
	checks.push(check1);

	// Check 2: Tier compliance (executors don't call npm run)
	let tierViolations = 0;
	for (const packagePath of packages) {
		const content = await readFile(packagePath, "utf-8");
		const pkg: PackageJson = JSON.parse(content);

		if (!pkg.scripts) {
			continue;
		}

		for (const [scriptName, scriptContent] of Object.entries(pkg.scripts)) {
			// Executors (no colon, tool names) shouldn't call npm run
			if (
				!scriptName.includes(":") &&
				!IGNORE_SCRIPTS.includes(scriptName) &&
				(scriptContent as string).includes("npm run")
			) {
				tierViolations++;
			}
		}
	}

	const check2: ValidationCheck = {
		name: "Tier compliance checks pass",
		passed: tierViolations === 0,
	};
	if (tierViolations > 0) {
		check2.details = `Found ${tierViolations} tier violations`;
	}
	checks.push(check2);

	// Check 3: No duplicate script names within packages
	let duplicates = 0;
	for (const packagePath of packages) {
		const content = await readFile(packagePath, "utf-8");
		const pkg: PackageJson = JSON.parse(content);

		if (!pkg.scripts) {
			continue;
		}

		const names = Object.keys(pkg.scripts);
		const uniqueNames = new Set(names);
		if (names.length !== uniqueNames.size) {
			duplicates++;
		}
	}

	const check3: ValidationCheck = {
		name: "No duplicate script names",
		passed: duplicates === 0,
	};
	if (duplicates > 0) {
		check3.details = `Found ${duplicates} packages with duplicates`;
	}
	checks.push(check3);

	return {
		allPassed: checks.every((c) => c.passed),
		checks,
	};
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find all package.json files in repository
 */
async function findPackages(repoDir: string): Promise<string[]> {
	const patterns = [
		"azure/**/package.json",
		"examples/**/package.json",
		"experimental/**/package.json",
		"packages/**/package.json",
	];

	const excludePatterns = ["**/node_modules/**", "**/dist/**", "**/lib/**"];

	const files = await glob(patterns, {
		cwd: repoDir,
		ignore: excludePatterns,
		absolute: true,
	});

	return files;
}

/**
 * Check if script content looks like an executor (runs tool directly)
 */
function looksLikeExecutor(scriptContent: string): boolean {
	// Executors typically:
	// - Run tools directly (tsc, eslint, jest, mocha, etc.)
	// - Don't call npm run, pnpm, yarn, or concurrently with npm: pattern
	// - Don't have && chains coordinating multiple steps

	// Orchestrators use these patterns
	if (
		scriptContent.includes("npm run") ||
		scriptContent.includes("pnpm ") ||
		scriptContent.includes("concurrently") ||
		scriptContent.includes("npm:") // concurrently "npm:script:*" pattern
	) {
		return false;
	}

	// Check for common executor tool names
	const toolNames = [
		"tsc",
		"eslint",
		"jest",
		"mocha",
		"prettier",
		"biome",
		"fluid-tsc",
		"flub",
		"api-extractor",
		"copyfiles",
		"rimraf",
	];

	return toolNames.some((tool) => scriptContent.includes(tool));
}

/**
 * Find scripts that reference a given script name
 */
function findScriptReferences(
	scripts: Record<string, string>,
	targetScript: string,
): string[] {
	const references: string[] = [];

	for (const [scriptName, scriptContent] of Object.entries(scripts)) {
		if (scriptContent.includes(`npm run ${targetScript}`) ||
				scriptContent.includes(`pnpm ${targetScript}`) ||
				scriptContent.includes(`yarn ${targetScript}`)) {
			references.push(scriptName);
		}
	}

	return references;
}

/**
 * Extract script references from script content
 */
function extractScriptReferences(scriptContent: string): string[] {
	const references: string[] = [];
	const patterns = [
		/npm run ([a-zA-Z0-9:-]+)/g,
		/pnpm ([a-zA-Z0-9:-]+)/g,
		/yarn ([a-zA-Z0-9:-]+)/g,
	];

	for (const pattern of patterns) {
		const matches = scriptContent.matchAll(pattern);
		for (const match of matches) {
			if (match[1]) {
				references.push(match[1]);
			}
		}
	}

	return references;
}

/**
 * Update script references based on rename map
 */
function updateScriptReferences(
	scriptContent: string,
	renameMap: Map<string, string>,
): string {
	let updated = scriptContent;

	// Sort rename entries by old name length (longest first) to handle nested names correctly
	// e.g., "build:test:esm:no-exactOptionalPropertyTypes" before "build:test:esm"
	const sortedEntries = Array.from(renameMap.entries()).sort(
		(a, b) => b[0].length - a[0].length,
	);

	// Build pattern prefix map for concurrently wildcard updates
	// e.g., if "build:api-reports:current" → "api-reports-current"
	//       and "build:api-reports:legacy" → "api-reports-legacy"
	//       then "npm:build:api-reports:*" should become "npm:api-reports-*"
	const prefixMap = new Map<string, string>();
	for (const [oldName, newName] of sortedEntries) {
		// Extract common prefix patterns (everything before the last segment)
		const oldParts = oldName.split(":");
		const newParts = newName.split("-");

		if (oldParts.length > 1) {
			// For multi-part names, map the prefix
			const oldPrefix = oldParts.slice(0, -1).join(":");
			const newPrefix = newParts.slice(0, -1).join("-");

			// Only add if we haven't seen this prefix or if it's consistent
			if (!prefixMap.has(oldPrefix) || prefixMap.get(oldPrefix) === newPrefix) {
				prefixMap.set(oldPrefix, newPrefix);
			}
		}
	}

	// Update concurrently wildcard patterns first
	for (const [oldPrefix, newPrefix] of prefixMap.entries()) {
		const escapedOldPrefix = oldPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

		// Update patterns like "npm:build:api-reports:*" → "npm:api-reports-*"
		updated = updated.replace(
			new RegExp(`npm:${escapedOldPrefix}:[*]`, "g"),
			`npm:${newPrefix}-*`,
		);
	}

	// Then update exact script name references
	for (const [oldName, newName] of sortedEntries) {
		// Escape special regex characters in oldName
		const escapedOldName = oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

		// Replace npm run references
		updated = updated.replace(
			new RegExp(`npm run ${escapedOldName}\\b`, "g"),
			`npm run ${newName}`,
		);

		// Replace pnpm references
		updated = updated.replace(
			new RegExp(`pnpm ${escapedOldName}\\b`, "g"),
			`pnpm ${newName}`,
		);

		// Replace yarn references
		updated = updated.replace(
			new RegExp(`yarn ${escapedOldName}\\b`, "g"),
			`yarn ${newName}`,
		);

		// Replace npm: references in concurrently calls (exact match)
		updated = updated.replace(
			new RegExp(`npm:${escapedOldName}\\b`, "g"),
			`npm:${newName}`,
		);
	}

	return updated;
}

/**
 * Update fluidBuild task references in format @package-name#task-name or simple task-name
 */
function updateFluidBuildReference(
	ref: string,
	renameMap: Map<string, string>,
	unconditionalRenameMap: Map<string, string>,
): string {
	// Handle @package#task-name format (cross-package reference)
	// Only use unconditional renames for cross-package refs since we can't
	// evaluate conditions for tasks in other packages
	const match = ref.match(/^(@[^#]+)#(.+)$/);
	if (match && match[1] && match[2]) {
		const packageName = match[1];
		const taskName = match[2];
		const newTaskName = unconditionalRenameMap.get(taskName) ?? taskName;
		return `${packageName}#${newTaskName}`;
	}

	// Handle references with special prefixes (^, ~, #)
	// These prefixes need to be preserved while the task name is renamed
	const prefixMatch = ref.match(/^([~^#])(.+)$/);
	if (prefixMatch && prefixMatch[1] && prefixMatch[2]) {
		const prefix = prefixMatch[1]; // e.g., "^" or "~"
		const taskName = prefixMatch[2]; // e.g., "build:esnext"
		const newTaskName = renameMap.get(taskName) ?? taskName;
		return `${prefix}${newTaskName}`;
	}

	// Simple task name - check if it needs to be renamed
	const newTaskName = renameMap.get(ref) ?? ref;
	return newTaskName;
}
