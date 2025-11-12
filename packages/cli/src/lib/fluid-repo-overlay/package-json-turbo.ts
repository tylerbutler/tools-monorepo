/**
 * Module for updating package.json files for turbo
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { Logger } from "@tylerbu/cli-api";
import { glob } from "tinyglobby";

interface PackageJson {
	[key: string]: unknown;
	scripts?: Record<string, string>;
	devDependencies?: Record<string, string>;
	fluidBuild?: Record<string, unknown>;
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

// Root package.json turbo scripts based on actual turbo.jsonc task names
const ROOT_TURBO_SCRIPTS: Record<string, string> = {
	build: "turbo run build",
	"build:legacy": "fluid-build --task build",
	"build-and-test": "turbo run test:unit test:mocha test:jest",
	"build-and-test:legacy": "fluid-build --task test --worker",
	"build-and-test:cjs": "turbo run test:cjs",
	"build-and-test:cjs:legacy": "fluid-build --task test:cjs --worker",
	"build-and-test:esm": "turbo run test:esm",
	"build-and-test:esm:legacy": "fluid-build --task test:esm --worker",
	"build-and-test:jest": "turbo run test:jest",
	"build-and-test:jest:legacy": "fluid-build --task test:jest --worker",
	"build-and-test:mocha": "turbo run test:mocha",
	"build-and-test:mocha:legacy": "fluid-build --task test:mocha --worker",
	"build-and-test:mocha:cjs": "turbo run test:mocha:cjs",
	"build-and-test:mocha:cjs:legacy":
		"fluid-build --task test:mocha:cjs --worker",
	"build-and-test:mocha:esm": "turbo run test:mocha:esm",
	"build-and-test:mocha:esm:legacy":
		"fluid-build --task test:mocha:esm --worker",
	"build-and-test:unit": "turbo run test:unit",
	"build-and-test:unit:legacy": "fluid-build --task test:unit --worker",
	"build-and-test:unit:cjs": "turbo run test:unit:cjs",
	"build-and-test:unit:cjs:legacy": "fluid-build --task test:unit:cjs --worker",
	"build-and-test:unit:esm": "turbo run test:unit:esm",
	"build-and-test:unit:esm:legacy": "fluid-build --task test:unit:esm --worker",
	"build:api": "turbo run build:api-reports",
	"build:api:legacy": "fluid-build --task build:api",
	"build:compile": "turbo run compile",
	"build:compile:legacy": "fluid-build --task compile",
	"build:docs": "turbo run api-extractor",
	"build:docs:legacy": "fluid-build --task api-extractor",
	"build:eslint": "turbo run eslint",
	"build:eslint:legacy": "fluid-build --task eslint",
	"build:fast": "turbo run build",
	"build:fast:legacy": "fluid-build --task build --worker",
	"build:full": "turbo run full",
	"build:full:legacy": "fluid-build --task full",
	"build:full:compile": "turbo run compile webpack",
	"build:full:compile:legacy": "fluid-build --task compile --task webpack",
	"build:gendocs:client": "turbo run build:gendocs:client",
	"build:gendocs:client:legacy": "fluid-build --task build:gendocs:client",
	"check:are-the-types-wrong": "turbo run attw",
	"check:are-the-types-wrong:legacy": "fluid-build --task attw",
	checks: "turbo run checks",
	"checks:legacy": "fluid-build --task checks",
	"checks:fix": "turbo run checks:fix",
	"checks:fix:legacy": "fluid-build --task checks:fix",
	"ci:build": "turbo run ci:build",
	"ci:build:legacy": "fluid-build --task ci:build",
	"ci:build:docs": "turbo run api-extractor-ci-docs",
	"ci:build:docs:legacy": "fluid-build --task api-extractor-ci-docs",
	clean: "turbo run clean",
	"clean:legacy": "fluid-build --task clean",
	eslint: "turbo run eslint",
	"eslint:legacy": "fluid-build --task eslint",
	"eslint:fix": "turbo run eslint:fix",
	"eslint:fix:legacy": "fluid-build --task eslint:fix",
	format: "turbo run format",
	"format:legacy": "fluid-build --task format",
	"format:biome": "turbo run format:biome",
	"format:biome:legacy": "fluid-build --task format:biome",
	"generate:packageList": "turbo run generate:packageList",
	"generate:packageList:legacy": "fluid-build --task generate:packageList",
	lint: "turbo run lint",
	"lint:legacy": "fluid-build --task lint",
	"lint:fix": "turbo run lint:fix",
	"lint:fix:legacy": "fluid-build --task lint:fix",
	tsc: "turbo run tsc",
	"tsc:legacy": "fluid-build --task tsc",
	"tsc:fast": "turbo run tsc",
	"tsc:fast:legacy": "fluid-build --task tsc --worker",
	"typetests:gen": "turbo run typetests:gen",
	"typetests:gen:legacy": "fluid-build --task typetests:gen",
	webpack: "turbo run webpack",
	"webpack:legacy": "fluid-build --task webpack",
	"webpack:profile": "turbo run webpack:profile",
	"webpack:profile:legacy": "fluid-build --task webpack:profile",
};

// Override mode - set to true to replace existing scripts that differ
const OVERRIDE_EXISTING_SCRIPTS = true;

/**
 * Update root package.json with turbo dependencies
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Script iteration logic is inherently complex
export async function updateRootPackageJsonForTurbo(
	repoRoot: string,
	logger: Logger,
): Promise<void> {
	const packageJsonPath = join(repoRoot, "package.json");

	logger.log("📦 Updating root package.json...");

	const content = await readFile(packageJsonPath, "utf-8");
	const packageJson: PackageJson = JSON.parse(content);

	let modified = false;

	// Add turbo to devDependencies if not present
	if (!packageJson.devDependencies) {
		packageJson.devDependencies = {};
	}

	if (packageJson.devDependencies["turbo"]) {
		logger.log("  ℹ️  turbo already in devDependencies");
	} else {
		packageJson.devDependencies["turbo"] = "^2.3.3";
		modified = true;
		logger.log("  ✅ Added turbo dependency");
	}

	// Add turbo scripts to root package.json if not present
	if (!packageJson.scripts) {
		packageJson.scripts = {};
	}

	for (const [scriptName, scriptCommand] of Object.entries(
		ROOT_TURBO_SCRIPTS,
	)) {
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
export async function updatePackageJsonFilesForTurbo(
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
			const result = await updateSinglePackageJsonForTurbo(filePath, logger);
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
 * Update a single package.json file for turbo
 */
async function updateSinglePackageJsonForTurbo(
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
 * Check if root package.json needs turbo updates
 */
export async function needsPackageJsonUpdatesForTurbo(
	repoRoot: string,
): Promise<boolean> {
	const packageJsonPath = join(repoRoot, "package.json");

	try {
		const content = await readFile(packageJsonPath, "utf-8");
		const packageJson: PackageJson = JSON.parse(content);

		// Check if turbo is in devDependencies
		if (!packageJson.devDependencies?.["turbo"]) {
			return true;
		}

		// Check if any turbo scripts are missing
		if (packageJson.scripts) {
			for (const scriptName of Object.keys(ROOT_TURBO_SCRIPTS)) {
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
