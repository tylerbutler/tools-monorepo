/**
 * Module for updating package.json files for nx
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { glob } from "tinyglobby";

interface PackageJson {
	[key: string]: any;
	scripts?: Record<string, string>;
	devDependencies?: Record<string, string>;
	fluidBuild?: any;
	pnpm?: {
		onlyBuiltDependencies?: string[];
		[key: string]: any;
	};
}

const FLUID_BUILD_SCRIPTS = [
	"build",
	"build:commonjs",
	"build:compile",
	"build:lint",
	"build:api",
	"build:docs",
	"lint",
	"lint:fix",
	"test",
	"test:unit",
];

// Nx wrapper scripts to add to individual packages for developer ease
const NX_WRAPPER_SCRIPTS: Record<string, string> = {
	build: "nx build",
	compile: "nx compile",
	"build:compile": "nx build:compile",
	"build:lint": "nx build:lint",
	"build:api": "nx build:api",
	"build:docs": "nx build:docs",
	lint: "nx lint",
	"lint:fix": "nx lint:fix",
	test: "nx test",
	"test:unit": "nx test:unit",
	"test:mocha": "nx test:mocha",
	"test:jest": "nx test:jest",
	clean: "nx clean",
};

// Root package.json nx scripts based on actual nx.json task names
// Note: These use the actual target names from nx.json, not the old fluid-build task names
const ROOT_NX_SCRIPTS: Record<string, string> = {
	"build-and-test:nx": "nx run-many -t test:unit",
	"build:compile:nx": "nx run-many -t build:compile",
	"build:nx":
		"nx run-many -t check:format build:compile build:lint build:api build:docs build:manifest build:readme",
	"ci:build:nx":
		"nx run-many -t build:compile build:lint build:api build:docs build:manifest build:readme",
	"compile:nx": "nx run-many -t tsc esnext copy-files",
	"full:nx":
		"nx run-many -t check:format build:compile build:lint build:api build:docs build:manifest build:readme webpack",
	"lint:nx": "nx run-many -t lint",
	"tsc:nx": "nx run-many -t tsc",
};

// Override mode - set to true to replace existing scripts that differ
const OVERRIDE_EXISTING_SCRIPTS = false;

/**
 * Update root package.json with nx dependencies
 */
export async function updateRootPackageJson(repoRoot: string): Promise<void> {
	const packageJsonPath = path.join(repoRoot, "package.json");

	console.log("📦 Updating root package.json...");

	const content = await fs.readFile(packageJsonPath, "utf-8");
	const packageJson: PackageJson = JSON.parse(content);

	let modified = false;

	// Add nx to devDependencies if not present
	if (!packageJson.devDependencies) {
		packageJson.devDependencies = {};
	}

	if (!packageJson.devDependencies["nx"]) {
		packageJson.devDependencies["nx"] = "21.6.5";
		packageJson.devDependencies["@nx/workspace"] = "^21.6.5";
		modified = true;
		console.log("  ✅ Added nx dependencies");
	} else {
		console.log("  ℹ️  nx already in devDependencies");
	}

	// Add nx to pnpm.onlyBuiltDependencies if not present
	if (packageJson.pnpm?.onlyBuiltDependencies) {
		if (!packageJson.pnpm.onlyBuiltDependencies.includes("nx")) {
			packageJson.pnpm.onlyBuiltDependencies.push("nx");
			// Sort for consistency
			packageJson.pnpm.onlyBuiltDependencies.sort();
			modified = true;
			console.log("  ✅ Added nx to onlyBuiltDependencies");
		} else {
			console.log("  ℹ️  nx already in onlyBuiltDependencies");
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
			console.log(`  ✅ Added script: ${scriptName}`);
		} else if (packageJson.scripts[scriptName] !== scriptCommand) {
			if (OVERRIDE_EXISTING_SCRIPTS) {
				packageJson.scripts[scriptName] = scriptCommand;
				modified = true;
				console.log(`  ✅ Updated script: ${scriptName}`);
			} else {
				console.log(
					`  ⚠️  Script "${scriptName}" exists but differs from expected`,
				);
				console.log(`     Current:  ${packageJson.scripts[scriptName]}`);
				console.log(`     Expected: ${scriptCommand}`);
			}
		} else {
			console.log(`  ℹ️  Script "${scriptName}" already correct`);
		}
	}

	if (modified) {
		await fs.writeFile(
			packageJsonPath,
			JSON.stringify(packageJson, null, 2) + "\n",
			"utf-8",
		);
		console.log("  ✅ Root package.json updated");
	} else {
		console.log("  ℹ️  No changes needed to root package.json");
	}
}

/**
 * Update individual package package.json files by removing fluidBuild sections
 * and fluid-build script references
 */
export async function updatePackageJsonFiles(repoRoot: string): Promise<void> {
	console.log("📦 Updating package.json files in packages...");

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
			const result = await updateSinglePackageJson(filePath);
			totalProcessed++;
			if (result) {
				totalModified++;
			}
		}
	}

	console.log(`  ✅ Processed ${totalProcessed} package.json files`);
	console.log(`  ✅ Modified ${totalModified} package.json files`);
}

/**
 * Update a single package.json file
 */
async function updateSinglePackageJson(filePath: string): Promise<boolean> {
	const content = await fs.readFile(filePath, "utf-8");
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

	// Replace fluid-build script references with nx wrappers
	for (const scriptName of FLUID_BUILD_SCRIPTS) {
		if (packageJson.scripts[scriptName]?.includes("fluid-build")) {
			// Replace with nx wrapper if we have one defined
			if (NX_WRAPPER_SCRIPTS[scriptName]) {
				packageJson.scripts[scriptName] = NX_WRAPPER_SCRIPTS[scriptName];
				modified = true;
			} else {
				// Delete if no wrapper defined
				delete packageJson.scripts[scriptName];
				modified = true;
			}
		}
	}

	// Add nx wrapper scripts for common tasks (if not already present)
	for (const [scriptName, scriptCommand] of Object.entries(
		NX_WRAPPER_SCRIPTS,
	)) {
		if (!packageJson.scripts[scriptName]) {
			packageJson.scripts[scriptName] = scriptCommand;
			modified = true;
		}
	}

	if (modified) {
		await fs.writeFile(
			filePath,
			JSON.stringify(packageJson, null, 2) + "\n",
			"utf-8",
		);
		const relativePath = path.relative(process.cwd(), filePath);
		console.log(`  ✏️  Modified: ${relativePath}`);
	}

	return modified;
}

/**
 * Check if a package.json file needs nx updates
 */
export async function needsPackageJsonUpdates(
	repoRoot: string,
): Promise<boolean> {
	const packageJsonPath = path.join(repoRoot, "package.json");

	try {
		const content = await fs.readFile(packageJsonPath, "utf-8");
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
