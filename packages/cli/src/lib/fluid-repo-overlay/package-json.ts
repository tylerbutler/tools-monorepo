/**
 * Module for updating package.json files for nx
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, relative } from "pathe";
import type { Logger } from "@tylerbu/cli-api";
import { glob } from "tinyglobby";

interface PackageJson {
	[key: string]: unknown;
	scripts?: Record<string, string>;
	devDependencies?: Record<string, string>;
	fluidBuild?: Record<string, unknown>;
	pnpm?: {
		onlyBuiltDependencies?: string[];
		[key: string]: unknown;
	};
}

// Scripts to remove from individual packages (replaced by direct task invocation)
// These are orchestration-level scripts that should only exist at root level
const ORCHESTRATION_SCRIPT_PATTERNS = [
	"fluid-build",
	"turbo run",
	"turbo ",
	"nx run",
	"nx ",
];

// Root package.json nx scripts based on actual nx.json task names
// Note: These use the actual target names from nx.json, not the old fluid-build task names
const ROOT_NX_SCRIPTS: Record<string, string> = {
	// Main nx scripts (replace fluid-build commands)
	build:
		"nx run-many -t check:format build:compile build:lint build:api api-extractor build:manifest build:readme",
	"build-and-test": "nx run-many -t test:unit",
	"build:compile": "nx run-many -t build:compile",
	"build:full":
		"nx run-many -t check:format build:compile build:lint build:api api-extractor build:manifest build:readme webpack",
	"ci:build":
		"nx run-many -t build:compile build:lint build:api api-extractor build:manifest build:readme",
	compile: "nx run-many -t tsc esnext copy-files",
	format: "biome format . --write",
	lint: "nx run-many -t lint",
	tsc: "nx run-many -t tsc",
};

// Override mode - set to true to replace existing scripts that differ
const OVERRIDE_EXISTING_SCRIPTS = true;

/**
 * Update root package.json with nx dependencies
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Script iteration logic is inherently complex
export async function updateRootPackageJson(
	repoRoot: string,
	logger: Logger,
): Promise<void> {
	const packageJsonPath = join(repoRoot, "package.json");

	logger.log("📦 Updating root package.json...");

	const content = await readFile(packageJsonPath, "utf-8");
	const packageJson: PackageJson = JSON.parse(content);

	let modified = false;

	// Add nx to devDependencies if not present
	if (!packageJson.devDependencies) {
		packageJson.devDependencies = {};
	}

	if (packageJson.devDependencies["nx"]) {
		logger.log("  ℹ️  nx already in devDependencies");
	} else {
		packageJson.devDependencies["nx"] = "21.6.5";
		packageJson.devDependencies["@nx/workspace"] = "^21.6.5";
		packageJson.devDependencies["@nx/azure-cache"] = "^4.0.0";
		packageJson.devDependencies["@nx/s3-cache"] = "^4.0.0";
		modified = true;
		logger.log("  ✅ Added nx dependencies");
	}

	// Add nx to pnpm.onlyBuiltDependencies if not present
	if (packageJson.pnpm?.onlyBuiltDependencies) {
		if (packageJson.pnpm.onlyBuiltDependencies.includes("nx")) {
			logger.log("  ℹ️  nx already in onlyBuiltDependencies");
		} else {
			packageJson.pnpm.onlyBuiltDependencies.push("nx");
			// Sort for consistency
			packageJson.pnpm.onlyBuiltDependencies.sort();
			modified = true;
			logger.log("  ✅ Added nx to onlyBuiltDependencies");
		}
	}

	// Add nx scripts to root package.json if not present
	if (!packageJson.scripts) {
		packageJson.scripts = {};
	}

	for (const [scriptName, scriptCommand] of Object.entries(ROOT_NX_SCRIPTS)) {
		if (!packageJson.scripts[scriptName]) {
			packageJson.scripts[scriptName] = scriptCommand;
			modified = true;
			logger.log(`  ✅ Added script: ${scriptName}`);
		} else if (packageJson.scripts[scriptName] !== scriptCommand) {
			if (OVERRIDE_EXISTING_SCRIPTS) {
				packageJson.scripts[scriptName] = scriptCommand;
				modified = true;
				logger.log(`  ✅ Updated script: ${scriptName}`);
			} else {
				logger.warning(
					`  ⚠️  Script "${scriptName}" exists but differs from expected`,
				);
				logger.log(`     Current:  ${packageJson.scripts[scriptName]}`);
				logger.log(`     Expected: ${scriptCommand}`);
			}
		} else {
			logger.log(`  ℹ️  Script "${scriptName}" already correct`);
		}
	}

	if (modified) {
		await writeFile(
			packageJsonPath,
			`${JSON.stringify(packageJson, null, 2)}\n`,
			"utf-8",
		);
		logger.log("  ✅ Root package.json updated");
	} else {
		logger.log("  ℹ️  No changes needed to root package.json");
	}
}

/**
 * Update individual package package.json files by removing fluidBuild sections
 * and fluid-build script references
 */
export async function updatePackageJsonFiles(
	repoRoot: string,
	logger: Logger,
): Promise<void> {
	logger.log("📦 Updating package.json files in packages...");

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
			const result = await updateSinglePackageJson(filePath, logger);
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
 * Update a single package.json file
 */
async function updateSinglePackageJson(
	filePath: string,
	logger: Logger,
): Promise<boolean> {
	const content = await readFile(filePath, "utf-8");
	const packageJson: PackageJson = JSON.parse(content);

	let modified = false;

	// Remove fluidBuild section
	if (packageJson.fluidBuild) {
		delete packageJson.fluidBuild;
		modified = true;
	}

	// Initialize scripts if not present
	if (!packageJson.scripts) {
		packageJson.scripts = {};
	}

	// Remove orchestration-level script references (fluid-build, turbo, nx)
	// Individual packages should only contain executor-level (tier 3) scripts
	for (const [scriptName, scriptCommand] of Object.entries(
		packageJson.scripts,
	)) {
		if (typeof scriptCommand === "string") {
			// Check if script uses orchestration tools
			for (const pattern of ORCHESTRATION_SCRIPT_PATTERNS) {
				if (scriptCommand.includes(pattern)) {
					// Remove the script entirely
					delete packageJson.scripts[scriptName];
					modified = true;
					break;
				}
			}
		}
	}

	if (modified) {
		await writeFile(
			filePath,
			`${JSON.stringify(packageJson, null, 2)}\n`,
			"utf-8",
		);
		const relativePath = relative(process.cwd(), filePath);
		logger.log(`  ✏️  Modified: ${relativePath}`);
	}

	return modified;
}

/**
 * Check if a package.json file needs nx updates
 */
export async function needsPackageJsonUpdates(
	repoRoot: string,
): Promise<boolean> {
	const packageJsonPath = join(repoRoot, "package.json");

	try {
		const content = await readFile(packageJsonPath, "utf-8");
		const packageJson: PackageJson = JSON.parse(content);

		// Check if nx is in devDependencies
		if (!packageJson.devDependencies?.["nx"]) {
			return true;
		}

		// Check if nx is in pnpm.onlyBuiltDependencies
		if (
			packageJson.pnpm?.onlyBuiltDependencies &&
			!packageJson.pnpm.onlyBuiltDependencies.includes("nx")
		) {
			return true;
		}

		// Check if any nx scripts are missing
		if (packageJson.scripts) {
			for (const scriptName of Object.keys(ROOT_NX_SCRIPTS)) {
				if (!packageJson.scripts[scriptName]) {
					return true;
				}
			}
		} else {
			return true;
		}

		return false;
	} catch {
		return true;
	}
}
