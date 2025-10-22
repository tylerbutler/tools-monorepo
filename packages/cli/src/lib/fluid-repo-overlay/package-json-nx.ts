/**
 * Module for updating package.json files for Nx
 */

import { readFile, writeFile } from "node:fs/promises";
import { relative } from "node:path";
import type { Logger } from "@tylerbu/cli-api";
import { glob } from "tinyglobby";

interface PackageJson {
	[key: string]: unknown;
	scripts?: Record<string, string>;
	devDependencies?: Record<string, string>;
	fluidBuild?: Record<string, unknown>;
}

// Tier 2 aggregation tasks that need to exist as NO-OP scripts for Nx to run them
// These are defined in nx.json targetDefaults with dependsOn arrays
// The actual work is done by their dependencies (Tier 3 executor tasks)
const TIER2_AGGREGATION_TASKS: Record<string, string> = {
	// Build aggregation tasks
	"build:compile": "exit 0",
	"build:lint": "exit 0",
	"build:api": "exit 0",
	"build:api:current": "exit 0",
	"build:api:legacy": "exit 0",
	"build:docs": "exit 0",
	"build:readme": "exit 0",
	"build:manifest": "exit 0",

	// Test aggregation tasks
	"test-build": "exit 0",
	"test-build-cjs": "exit 0",
	"test-build-esm": "exit 0",
	"test:unit": "exit 0",
	"test:unit:cjs": "exit 0",
	"test:unit:esm": "exit 0",

	// Lint aggregation task (primary one that was being skipped)
	lint: "exit 0",

	// Other aggregation tasks
	mocha: "exit 0",
	checks: "exit 0",
	full: "exit 0",
};

// Tier 3 executor tasks that call actual tools
// Only add these if we detect the tool is actually used in the package
// Most FluidFramework packages already have these, but we'll add them if missing
const TIER3_EXECUTOR_TASKS: Record<
	string,
	{ script: string; detectFiles: string[] }
> = {
	eslint: {
		script: "eslint --format stylish src",
		detectFiles: [".eslintrc.json", ".eslintrc.cjs", ".eslintrc.js"],
	},
	"good-fences": {
		script: "good-fences",
		detectFiles: ["fence.json"],
	},
	depcruise: {
		script: "depcruise src",
		detectFiles: [".dependency-cruiser.js", ".dependency-cruiser.cjs"],
	},
	prettier: {
		script: "prettier --check .",
		detectFiles: [".prettierrc", ".prettierrc.json", ".prettierrc.js"],
	},
	"check:biome": {
		script: "biome check .",
		detectFiles: ["biome.jsonc", "biome.json"],
	},
	"format:biome": {
		script: "biome check . --write",
		detectFiles: ["biome.jsonc", "biome.json"],
	},
	"check:prettier": {
		script: "prettier --check .",
		detectFiles: [".prettierrc", ".prettierrc.json", ".prettierrc.js"],
	},
	"format:prettier": {
		script: "prettier --write .",
		detectFiles: [".prettierrc", ".prettierrc.json", ".prettierrc.js"],
	},
};

/**
 * Update individual package package.json files by adding Nx-required scripts
 */
export async function updatePackageJsonFilesForNx(
	repoRoot: string,
	logger: Logger,
): Promise<void> {
	logger.log("📦 Updating package.json files for Nx...");

	// Find all package.json files in azure, examples, experimental, packages directories
	const patterns = [
		"azure/**/package.json",
		"examples/**/package.json",
		"experimental/**/package.json",
		"packages/**/package.json",
	];

	const excludePatterns = ["**/node_modules/**", "**/dist/**", "**/lib/**"];

	let totalProcessed = 0;
	let totalModified = 0;

	for (const pattern of patterns) {
		const files = await glob([pattern], {
			cwd: repoRoot,
			ignore: excludePatterns,
			absolute: true,
		});

		for (const filePath of files) {
			const result = await updateSinglePackageJsonForNx(
				filePath,
				repoRoot,
				logger,
			);
			totalProcessed++;
			if (result) {
				totalModified++;
			}
		}
	}

	logger.log(`  ✅ Processed ${totalProcessed} package.json files`);
	logger.log(`  ✅ Modified ${totalModified} package.json files`);
}

/**
 * Update a single package.json file for Nx
 */
async function updateSinglePackageJsonForNx(
	filePath: string,
	repoRoot: string,
	logger: Logger,
): Promise<boolean> {
	const content = await readFile(filePath, "utf-8");
	const packageJson: PackageJson = JSON.parse(content);

	let modified = false;

	// Initialize scripts if not present
	if (!packageJson.scripts) {
		packageJson.scripts = {};
	}

	// Add/update Tier 2 aggregation tasks as NO-OP scripts
	// Replace any existing scripts that reference fluid-build
	for (const [taskName, taskScript] of Object.entries(
		TIER2_AGGREGATION_TASKS,
	)) {
		const existingScript = packageJson.scripts[taskName];

		if (!existingScript) {
			// Add if doesn't exist
			packageJson.scripts[taskName] = taskScript;
			modified = true;
		} else if (
			typeof existingScript === "string" &&
			existingScript.includes("fluid-build")
		) {
			// Replace if it references fluid-build
			packageJson.scripts[taskName] = taskScript;
			modified = true;
		}
	}

	// Optionally add Tier 3 executor tasks if tool config files are detected
	// This is optional because most packages already have these
	// We only add them if the tool is configured but the script is missing
	// TODO: Implement detection logic if needed
	// For now, we'll skip this since most FluidFramework packages already have executor scripts

	// Remove fluidBuild section if present (Nx doesn't use it)
	if (packageJson.fluidBuild) {
		delete packageJson.fluidBuild;
		modified = true;
	}

	if (modified) {
		await writeFile(
			filePath,
			`${JSON.stringify(packageJson, null, 2)}\n`,
			"utf-8",
		);
		const relativePath = relative(repoRoot, filePath);
		logger.verbose(`  ✏️  Modified: ${relativePath}`);
	}

	return modified;
}
