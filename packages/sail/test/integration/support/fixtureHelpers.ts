import { cp, mkdir, writeFile } from "node:fs/promises";
import { join } from "pathe";

/**
 * Helpers for creating and managing integration test fixtures.
 */

/**
 * Package metadata for creating test fixtures.
 */
export interface FixturePackage {
	/**
	 * Package name (e.g., "@test/app")
	 */
	name: string;

	/**
	 * Package version
	 */
	version: string;

	/**
	 * Directory name within the monorepo (e.g., "packages/app")
	 */
	directory: string;

	/**
	 * Workspace dependencies (package name → version)
	 */
	dependencies?: Record<string, string>;

	/**
	 * npm scripts to include in package.json
	 */
	scripts?: Record<string, string>;

	/**
	 * Source files to create (relative path → content)
	 */
	sourceFiles?: Record<string, string>;
}

/**
 * Monorepo fixture configuration.
 */
export interface FixtureMonorepo {
	/**
	 * Root package.json configuration
	 */
	root: {
		name: string;
		version: string;
		private: boolean;
		workspaces: string[];
	};

	/**
	 * Packages to create in the monorepo
	 */
	packages: FixturePackage[];

	/**
	 * Root-level files to create (relative path → content)
	 */
	rootFiles?: Record<string, string>;
}

/**
 * Creates a monorepo fixture in the specified directory.
 *
 * @param targetDir - Absolute path where the fixture should be created
 * @param config - Monorepo configuration
 * @returns Promise that resolves when fixture creation is complete
 *
 * @example
 * ```typescript
 * await createMonorepoFixture("/tmp/test-monorepo", {
 *   root: {
 *     name: "test-monorepo",
 *     version: "1.0.0",
 *     private: true,
 *     workspaces: ["packages/*"]
 *   },
 *   packages: [
 *     {
 *       name: "@test/lib",
 *       version: "1.0.0",
 *       directory: "packages/lib",
 *       scripts: { build: "tsc" },
 *       sourceFiles: { "src/index.ts": "export const lib = 'lib';" }
 *     }
 *   ]
 * });
 * ```
 */
export async function createMonorepoFixture(
	targetDir: string,
	config: FixtureMonorepo,
): Promise<void> {
	// Create root package.json
	const rootPackageJson = {
		name: config.root.name,
		private: config.root.private,
		version: config.root.version,
		workspaces: config.root.workspaces,
	};

	await writeFile(
		join(targetDir, "package.json"),
		JSON.stringify(rootPackageJson, null, 2),
	);

	// Create root-level files
	if (config.rootFiles) {
		for (const [filePath, content] of Object.entries(config.rootFiles)) {
			const fullPath = join(targetDir, filePath);
			await mkdir(join(fullPath, ".."), { recursive: true });
			await writeFile(fullPath, content);
		}
	}

	// Create each package
	for (const pkg of config.packages) {
		await createPackageFixture(targetDir, pkg);
	}
}

/**
 * Creates a single package fixture within a monorepo.
 *
 * @param monorepoRoot - Root directory of the monorepo
 * @param pkg - Package configuration
 * @returns Promise that resolves when package creation is complete
 */
async function createPackageFixture(
	monorepoRoot: string,
	pkg: FixturePackage,
): Promise<void> {
	const pkgDir = join(monorepoRoot, pkg.directory);

	// Create package directory
	await mkdir(pkgDir, { recursive: true });

	// Create package.json
	const packageJson: Record<string, unknown> = {
		name: pkg.name,
		version: pkg.version,
	};

	if (pkg.scripts) {
		packageJson.scripts = pkg.scripts;
	}

	if (pkg.dependencies) {
		packageJson.dependencies = pkg.dependencies;
	}

	await writeFile(
		join(pkgDir, "package.json"),
		JSON.stringify(packageJson, null, 2),
	);

	// Create source files
	if (pkg.sourceFiles) {
		for (const [filePath, content] of Object.entries(pkg.sourceFiles)) {
			const fullPath = join(pkgDir, filePath);
			await mkdir(join(fullPath, ".."), { recursive: true });
			await writeFile(fullPath, content);
		}
	}
}

/**
 * Copies a fixture from the fixtures directory to a target location.
 *
 * @param fixtureName - Name of the fixture directory (e.g., "simple-monorepo")
 * @param targetDir - Target directory where fixture should be copied
 * @returns Promise that resolves when copy is complete
 *
 * @example
 * ```typescript
 * await copyFixture("simple-monorepo", "/tmp/test-workspace");
 * ```
 */
export async function copyFixture(
	fixtureName: string,
	targetDir: string,
): Promise<void> {
	const fixtureSource = join(__dirname, "..", "fixtures", fixtureName);
	await cp(fixtureSource, targetDir, { recursive: true });
}

/**
 * Creates a basic TypeScript configuration file.
 *
 * @param targetDir - Directory where tsconfig.json should be created
 * @param config - TypeScript compiler options override
 * @returns Promise that resolves when file is created
 */
export async function createTsConfig(
	targetDir: string,
	config: Record<string, unknown> = {},
): Promise<void> {
	const defaultConfig = {
		compilerOptions: {
			declaration: true,
			esModuleInterop: true,
			module: "commonjs",
			outDir: "./dist",
			rootDir: "./src",
			strict: true,
			target: "ES2020",
			...config,
		},
		exclude: ["node_modules", "dist"],
		include: ["src/**/*"],
	};

	await writeFile(
		join(targetDir, "tsconfig.json"),
		JSON.stringify(defaultConfig, null, 2),
	);
}
