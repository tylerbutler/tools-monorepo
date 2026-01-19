/**
 * Module for updating package.json files for Nx
 */

import { readFile, writeFile } from "node:fs/promises";
import type { Logger } from "@tylerbu/cli-api";
import { relative } from "pathe";
import { glob } from "tinyglobby";

interface PackageJson {
	[key: string]: unknown;
	scripts?: Record<string, string>;
	devDependencies?: Record<string, string>;
	fluidBuild?: Record<string, unknown>;
	oclif?: Record<string, unknown>;
	nx?: {
		targets?: Record<string, Record<string, unknown>>;
		[key: string]: unknown;
	};
}

// Tier 2 aggregation tasks and their Tier 3 dependencies
// Based on nx.json targetDefaults
// We only add a Tier 2 task if at least one of its dependencies exists in the package
// Dependencies are defined in nx.json, so we just need to declare the target exists
interface Tier2Task {
	dependencies: string[]; // Tier 3 executor tasks or other Tier 2 tasks to check for
}

const TIER2_AGGREGATION_TASKS: Record<string, Tier2Task> = {
	// Build aggregation tasks
	"build:compile": {
		dependencies: ["tsc", "esnext", "copy-files"],
	},
	"build:lint": {
		dependencies: [
			"eslint",
			"good-fences",
			"depcruise",
			"check:exports",
			"check:release-tags",
		],
	},
	"build:api": {
		dependencies: ["build:api:current", "build:api:legacy"],
	},
	"build:api:current": {
		dependencies: ["api-extract-esm"],
	},
	"build:api:legacy": {
		dependencies: ["api-extract-esm"],
	},
	"build:docs": {
		dependencies: ["docs-extract"],
	},

	// Test aggregation tasks
	"test-build": {
		dependencies: ["test-build-cjs", "test-build-esm"],
	},
	"test-build-cjs": {
		dependencies: ["tsc"],
	},
	"test-build-esm": {
		dependencies: ["esnext"],
	},
	"test:unit": {
		dependencies: ["test:unit:cjs", "test:unit:esm"],
	},
	"test:unit:cjs": {
		dependencies: ["mocha-cjs", "jest"],
	},
	"test:unit:esm": {
		dependencies: ["mocha-esm"],
	},

	// Lint aggregation task
	lint: {
		dependencies: ["build:lint"],
	},

	// Other aggregation tasks
	mocha: {
		dependencies: ["mocha-cjs", "mocha-esm"],
	},
	checks: {
		dependencies: ["check:format"],
	},
	full: {
		dependencies: ["build", "webpack"],
	},
};

// OCLIF-specific Tier 2 aggregation tasks (only for packages with oclif config)
// These tasks generate OCLIF manifests and readmes
const OCLIF_TIER2_TASKS: Record<string, Tier2Task> = {
	"build:readme": {
		dependencies: ["build:compile"],
	},
	"build:manifest": {
		dependencies: ["build:compile"],
	},
};

/**
 * Update individual package package.json files by adding Nx-required targets
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
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Multi-field update with conditional logic
async function updateSinglePackageJsonForNx(
	filePath: string,
	repoRoot: string,
	logger: Logger,
): Promise<boolean> {
	const content = await readFile(filePath, "utf-8");
	const packageJson: PackageJson = JSON.parse(content);

	let modified = false;

	// Initialize nx.targets if not present
	if (!packageJson.nx) {
		packageJson.nx = {};
	}
	if (!packageJson.nx.targets) {
		packageJson.nx.targets = {};
	}

	// Initialize scripts if not present (needed for checking dependencies)
	if (!packageJson.scripts) {
		packageJson.scripts = {};
	}

	// Add Tier 2 aggregation tasks to nx.targets
	// Only add if at least one dependency exists in the package
	// The actual task configuration (dependsOn, etc.) comes from nx.json targetDefaults
	for (const [taskName, taskConfig] of Object.entries(
		TIER2_AGGREGATION_TASKS,
	)) {
		// Check if at least one dependency exists
		const hasDependency = taskConfig.dependencies.some(
			(dep) =>
				packageJson.scripts?.[dep] !== undefined ||
				packageJson.nx?.targets?.[dep] !== undefined,
		);

		// Only add if not already defined and has at least one dependency
		if (hasDependency && !packageJson.nx.targets[taskName]) {
			// Empty object - configuration comes from nx.json targetDefaults
			packageJson.nx.targets[taskName] = {};
			modified = true;
		}
	}

	// Add OCLIF-specific tasks only for packages with oclif configuration
	const isOclifPackage = packageJson.oclif !== undefined;
	if (isOclifPackage) {
		for (const [taskName, taskConfig] of Object.entries(OCLIF_TIER2_TASKS)) {
			// Check if at least one dependency exists
			const hasDependency = taskConfig.dependencies.some(
				(dep) =>
					packageJson.scripts?.[dep] !== undefined ||
					packageJson.nx?.targets?.[dep] !== undefined,
			);

			// Only add if not already defined and has at least one dependency
			if (hasDependency && !packageJson.nx.targets[taskName]) {
				// Empty object - configuration comes from nx.json targetDefaults
				packageJson.nx.targets[taskName] = {};
				modified = true;
			}
		}
	}

	// Remove any fluid-build script references for tasks we're managing
	const allManagedTasks = {
		...TIER2_AGGREGATION_TASKS,
		...(isOclifPackage ? OCLIF_TIER2_TASKS : {}),
	};
	for (const taskName of Object.keys(allManagedTasks)) {
		const existingScript = packageJson.scripts?.[taskName];
		if (
			existingScript &&
			typeof existingScript === "string" &&
			existingScript.includes("fluid-build")
		) {
			delete packageJson.scripts[taskName];
			modified = true;
		}
	}

	// Remove fluidBuild section if present (Nx doesn't use it)
	if (packageJson.fluidBuild) {
		delete packageJson.fluidBuild;
		modified = true;
	}

	// Clean up empty nx.targets if nothing was added
	if (
		packageJson.nx.targets &&
		Object.keys(packageJson.nx.targets).length === 0
	) {
		delete packageJson.nx.targets;
	}

	// Clean up empty nx object if nothing remains
	if (packageJson.nx && Object.keys(packageJson.nx).length === 0) {
		delete packageJson.nx;
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
