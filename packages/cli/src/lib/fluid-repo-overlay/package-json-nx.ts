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

// Tier 2 aggregation tasks and their Tier 3 dependencies
// Based on nx.json targetDefaults
// We only add a Tier 2 task if at least one of its dependencies exists in the package
interface Tier2Task {
	script: string;
	dependencies: string[]; // Tier 3 executor tasks or other Tier 2 tasks
}

const TIER2_AGGREGATION_TASKS: Record<string, Tier2Task> = {
	// Build aggregation tasks
	"build:compile": {
		script: "exit 0",
		dependencies: ["tsc", "esnext", "copy-files"],
	},
	"build:lint": {
		script: "exit 0",
		dependencies: [
			"eslint",
			"good-fences",
			"depcruise",
			"check:exports",
			"check:release-tags",
		],
	},
	"build:api": {
		script: "exit 0",
		dependencies: ["build:api:current", "build:api:legacy"],
	},
	"build:api:current": {
		script: "exit 0",
		dependencies: ["api-extract-esm"],
	},
	"build:api:legacy": {
		script: "exit 0",
		dependencies: ["api-extract-esm"],
	},
	"build:docs": {
		script: "exit 0",
		dependencies: ["docs-extract"],
	},
	"build:readme": {
		script: "exit 0",
		dependencies: ["build:compile"],
	},
	"build:manifest": {
		script: "exit 0",
		dependencies: ["build:compile"],
	},

	// Test aggregation tasks
	"test-build": {
		script: "exit 0",
		dependencies: ["test-build-cjs", "test-build-esm"],
	},
	"test-build-cjs": {
		script: "exit 0",
		dependencies: ["tsc"],
	},
	"test-build-esm": {
		script: "exit 0",
		dependencies: ["esnext"],
	},
	"test:unit": {
		script: "exit 0",
		dependencies: ["test:unit:cjs", "test:unit:esm"],
	},
	"test:unit:cjs": {
		script: "exit 0",
		dependencies: ["mocha-cjs", "jest"],
	},
	"test:unit:esm": {
		script: "exit 0",
		dependencies: ["mocha-esm"],
	},

	// Lint aggregation task
	lint: {
		script: "exit 0",
		dependencies: ["build:lint"],
	},

	// Other aggregation tasks
	mocha: {
		script: "exit 0",
		dependencies: ["mocha-cjs", "mocha-esm"],
	},
	checks: {
		script: "exit 0",
		dependencies: ["check:format"],
	},
	full: {
		script: "exit 0",
		dependencies: ["build", "webpack"],
	},
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
	// Only add if at least one dependency exists in the package
	// Replace any existing scripts that reference fluid-build
	for (const [taskName, taskConfig] of Object.entries(
		TIER2_AGGREGATION_TASKS,
	)) {
		const existingScript = packageJson.scripts[taskName];

		// Check if at least one dependency exists
		const hasDependency = taskConfig.dependencies.some(
			(dep) => packageJson.scripts?.[dep] !== undefined,
		);

		// Determine if we should add/update this task
		const shouldUpdate =
			hasDependency &&
			(!existingScript ||
				(typeof existingScript === "string" &&
					existingScript.includes("fluid-build")));

		if (shouldUpdate) {
			if (!existingScript) {
				// Add if doesn't exist and has dependencies
				packageJson.scripts[taskName] = taskConfig.script;
				modified = true;
			} else if (
				typeof existingScript === "string" &&
				existingScript.includes("fluid-build")
			) {
				// Replace if it references fluid-build
				packageJson.scripts[taskName] = taskConfig.script;
				modified = true;
			}
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
