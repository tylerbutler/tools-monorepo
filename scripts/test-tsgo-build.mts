#!/usr/bin/env tsx
/// <reference types="node" />
/**
 * Smoke test for tsgo-compiled output.
 * Validates that tsgo produces runnable JavaScript by importing
 * and executing basic functions from each compiled package.
 *
 * Usage:
 *   pnpm test:tsgo-build
 *   # or directly:
 *   tsx scripts/test-tsgo-build.mts
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

interface TestResult {
	package: string;
	status: "pass" | "fail" | "skip";
	error?: string;
	duration?: number;
}

const results: TestResult[] = [];

function log(msg: string) {
	console.log(msg);
}

function logResult(result: TestResult) {
	const icon =
		result.status === "pass" ? "✓" : result.status === "fail" ? "✗" : "○";
	const color =
		result.status === "pass"
			? "\x1b[32m"
			: result.status === "fail"
				? "\x1b[31m"
				: "\x1b[33m";
	const reset = "\x1b[0m";
	const duration = result.duration ? ` (${result.duration}ms)` : "";
	console.log(`  ${color}${icon}${reset} ${result.package}${duration}`);
	if (result.error) {
		console.log(`    ${result.error}`);
	}
}

async function testPackage(
	name: string,
	esmPath: string,
	testFn: (mod: unknown) => Promise<void> | void,
): Promise<TestResult> {
	const start = Date.now();
	const fullPath = join(rootDir, esmPath);

	if (!existsSync(fullPath)) {
		return {
			package: name,
			status: "skip",
			error: `File not found: ${esmPath}`,
		};
	}

	try {
		const mod = await import(fullPath);
		await testFn(mod);
		return { package: name, status: "pass", duration: Date.now() - start };
	} catch (err) {
		return {
			package: name,
			status: "fail",
			error: err instanceof Error ? err.message : String(err),
			duration: Date.now() - start,
		};
	}
}

async function runTests() {
	log("\n=== tsgo Build Smoke Tests ===\n");

	// Test @tylerbu/fundamentals
	results.push(
		await testPackage(
			"@tylerbu/fundamentals",
			"packages/fundamentals/esm/index.js",
			(mod: any) => {
				// Test isSorted function
				if (typeof mod.isSorted !== "function") {
					throw new Error("isSorted is not a function");
				}
				const sorted = mod.isSorted([1, 2, 3], (a: number, b: number) => a - b);
				if (sorted !== true) {
					throw new Error(
						`isSorted([1,2,3]) returned ${sorted}, expected true`,
					);
				}
			},
		),
	);

	// Test @tylerbu/fundamentals/set
	results.push(
		await testPackage(
			"@tylerbu/fundamentals/set",
			"packages/fundamentals/esm/set.js",
			(mod: any) => {
				// Test addAll function
				if (typeof mod.addAll !== "function") {
					throw new Error("addAll is not a function");
				}
				const set = new Set([1, 2]);
				mod.addAll(set, [3, 4]);
				if (set.size !== 4) {
					throw new Error(
						`addAll() resulted in set size ${set.size}, expected 4`,
					);
				}
			},
		),
	);

	// Test lilconfig-loader-ts
	results.push(
		await testPackage(
			"lilconfig-loader-ts",
			"packages/lilconfig-loader-ts/esm/index.js",
			(mod: any) => {
				if (typeof mod.TypeScriptLoader !== "function") {
					throw new Error("TypeScriptLoader is not a function");
				}
			},
		),
	);

	// Test xkcd2-api
	results.push(
		await testPackage(
			"xkcd2-api",
			"packages/xkcd2-api/esm/index.js",
			(mod: any) => {
				if (typeof mod.getRandomComicId !== "function") {
					throw new Error("getRandomComicId is not a function");
				}
			},
		),
	);

	// Test rehype-footnotes
	results.push(
		await testPackage(
			"rehype-footnotes",
			"packages/rehype-footnotes/esm/index.js",
			(mod: any) => {
				if (
					typeof mod.default !== "function" &&
					typeof mod.rehypeFootnotes !== "function"
				) {
					throw new Error("rehypeFootnotes plugin not exported");
				}
			},
		),
	);

	// Test remark-lazy-links
	results.push(
		await testPackage(
			"remark-lazy-links",
			"packages/remark-lazy-links/esm/index.js",
			(mod: any) => {
				if (
					typeof mod.default !== "function" &&
					typeof mod.remarkLazyLinks !== "function"
				) {
					throw new Error("remarkLazyLinks plugin not exported");
				}
			},
		),
	);

	// Test remark-shift-headings
	results.push(
		await testPackage(
			"remark-shift-headings",
			"packages/remark-shift-headings/esm/index.js",
			(mod: any) => {
				if (
					typeof mod.default !== "function" &&
					typeof mod.remarkShiftHeadings !== "function"
				) {
					throw new Error("remarkShiftHeadings plugin not exported");
				}
			},
		),
	);

	// Test remark-task-table
	results.push(
		await testPackage(
			"remark-task-table",
			"packages/remark-task-table/esm/index.js",
			(mod: any) => {
				if (
					typeof mod.default !== "function" &&
					typeof mod.remarkTaskTable !== "function"
				) {
					throw new Error("remarkTaskTable plugin not exported");
				}
			},
		),
	);

	// Test sort-tsconfig (CLI - just check it loads)
	results.push(
		await testPackage(
			"sort-tsconfig",
			"packages/sort-tsconfig/esm/index.js",
			(mod: any) => {
				if (typeof mod.sortTsconfigFile !== "function") {
					throw new Error("sortTsconfigFile is not a function");
				}
			},
		),
	);

	// Test repopo (CLI - just check it loads)
	results.push(
		await testPackage("repopo", "packages/repopo/esm/index.js", (_mod: any) => {
			// Just verify it loads without error
		}),
	);

	// Test cli-api
	results.push(
		await testPackage(
			"@tylerbu/cli-api",
			"packages/cli-api/esm/index.js",
			(mod: any) => {
				if (typeof mod.CommandWithConfig !== "function") {
					throw new Error("CommandWithConfig is not a function");
				}
			},
		),
	);

	// Print results
	log("\nResults:");
	for (const result of results) {
		logResult(result);
	}

	// Summary
	const passed = results.filter((r) => r.status === "pass").length;
	const failed = results.filter((r) => r.status === "fail").length;
	const skipped = results.filter((r) => r.status === "skip").length;

	log(`\nSummary: ${passed} passed, ${failed} failed, ${skipped} skipped`);

	if (failed > 0) {
		process.exit(1);
	}
}

// Check if we should build first
const shouldBuild = process.argv.includes("--build");

if (shouldBuild) {
	log("Building with tsgo...");
	try {
		execSync("pnpm exec tsgo --build tsconfig.tsgo.json", {
			cwd: rootDir,
			stdio: "inherit",
		});
	} catch {
		console.error("tsgo build failed");
		process.exit(1);
	}
}

runTests().catch((err) => {
	console.error("Test runner failed:", err);
	process.exit(1);
});
