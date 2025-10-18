/**
 * Core logic for renaming package.json scripts to follow three-tier naming principles
 */

import { readFile, writeFile } from "node:fs/promises";
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
		reason: "Executor: TypeScript compiler for experimental entry point",
	},
	{
		pattern: "build:esnext:main",
		replacement: "esnext-main",
		tier: 3,
		reason: "Executor: TypeScript compiler for main entry point",
	},
	{
		pattern: "build:esnext",
		replacement: "esnext",
		tier: 3,
		reason: "Executor should use tool name only (runs tsc directly)",
	},
	{
		pattern: "format-and-build",
		replacement: "build:format-first",
		tier: 2,
		reason: "More descriptive stage orchestrator name",
	},
	{
		pattern: "format-and-compile",
		replacement: "compile:format-first",
		tier: 2,
		reason: "More descriptive stage orchestrator name",
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
		reason: "L2 Orchestrator: called by build L1, not test L1",
	},
	{
		pattern: "test:build:cjs",
		replacement: "build:test:cjs",
		tier: 2,
		reason: "L2 Orchestrator: build stage variant for CJS",
	},
	{
		pattern: "test:build:esm",
		replacement: "build:test:esm",
		tier: 2,
		reason: "L2 Orchestrator: build stage variant for ESM",
	},

	// ========================================================================
	// Category A: Documentation Generation
	// ========================================================================
	{
		pattern: "build:docs",
		replacement: "api-extractor",
		tier: 3,
		reason: "Executor: tool name for api-extractor runner",
	},
	{
		pattern: "build:api-reports:current",
		replacement: "api-reports-current",
		tier: 3,
		reason: "Executor: semantic name with dash-separated variant",
	},
	{
		pattern: "build:api-reports:legacy",
		replacement: "api-reports-legacy",
		tier: 3,
		reason: "Executor: semantic name with dash-separated variant",
	},

	// ========================================================================
	// Category B: File Operations
	// ========================================================================
	{
		pattern: "build:copy",
		replacement: "copyfiles",
		tier: 3,
		reason: "Executor: tool name (called directly by L1 build)",
	},

	// ========================================================================
	// Category C: Test Infrastructure
	// ========================================================================
	// Note: build:test:cjs and build:test:esm compile test files (not run tests)
	{
		pattern: "build:test:cjs",
		replacement: "tsc-test-cjs",
		tier: 3,
		reason: "Executor: TypeScript compiler for CJS test files",
	},
	{
		pattern: "build:test:esm",
		replacement: "tsc-test-esm",
		tier: 3,
		reason: "Executor: TypeScript compiler for ESM test files",
	},
	{
		pattern: "build:test:esm:no-exactOptionalPropertyTypes",
		replacement: "tsc-test-esm-no-exactOptionalPropertyTypes",
		tier: 3,
		reason: "Executor: TypeScript compiler for ESM test files without exactOptionalPropertyTypes",
	},
	{
		pattern: "build:test:types",
		replacement: "tsc-test-types",
		tier: 3,
		reason: "Executor: TypeScript compiler for test type definitions",
	},
	{
		pattern: "build:test:mocha:cjs",
		replacement: "tsc-test-mocha-cjs",
		tier: 3,
		reason: "Executor: TypeScript compiler for CJS mocha test files",
	},
	{
		pattern: "build:test:mocha:esm",
		replacement: "tsc-test-mocha-esm",
		tier: 3,
		reason: "Executor: TypeScript compiler for ESM mocha test files",
	},
	{
		pattern: "build:test:jest",
		replacement: "jest",
		tier: 3,
		reason: "Executor: pure test runner tool name",
	},

	// ========================================================================
	// Category D: Export Generation
	// ========================================================================
	{
		pattern: "build:exports:browser",
		replacement: "generate-exports-browser",
		tier: 3,
		reason: "Executor: generates browser entry points using flub",
	},
	{
		pattern: "build:exports:node",
		replacement: "generate-exports-node",
		tier: 3,
		reason: "Executor: generates node entry points using flub",
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

	// Build rename map for efficient lookup
	const renameMap = new Map<string, string>();
	for (const rule of RENAME_RULES) {
		if (typeof rule.pattern === "string") {
			renameMap.set(rule.pattern, rule.replacement);
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

		// Write back if modified
		if (modified) {
			pkg.scripts = newScripts;
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

	for (const [oldName, newName] of renameMap.entries()) {
		// Replace npm run references
		updated = updated.replace(
			new RegExp(`npm run ${oldName}\\b`, "g"),
			`npm run ${newName}`,
		);

		// Replace pnpm references
		updated = updated.replace(
			new RegExp(`pnpm ${oldName}\\b`, "g"),
			`pnpm ${newName}`,
		);

		// Replace yarn references
		updated = updated.replace(
			new RegExp(`yarn ${oldName}\\b`, "g"),
			`yarn ${newName}`,
		);
	}

	return updated;
}
