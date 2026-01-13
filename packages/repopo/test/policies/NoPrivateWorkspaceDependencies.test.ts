import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NoPrivateWorkspaceDependenciesSettings } from "../../src/policies/NoPrivateWorkspaceDependencies.js";
import { NoPrivateWorkspaceDependencies } from "../../src/policies/NoPrivateWorkspaceDependencies.js";
import type { PolicyFunctionArguments } from "../../src/policy.js";

describe("NoPrivateWorkspaceDependencies policy", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "repopo-test-"));
		// Create a pnpm-workspace.yaml to make this a valid workspace
		writeFileSync(
			join(tempDir, "pnpm-workspace.yaml"),
			"packages:\n  - packages/*\n  - apps/*\n",
		);
		// Create a root package.json
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({ name: "test-workspace", version: "1.0.0" }, null, 2),
		);
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	/**
	 * Creates a package.json at the given relative path within tempDir.
	 * Returns the FULL path to the package.json file (for handler consumption)
	 * and the relative path (for error message verification).
	 */
	const createPackageJson = (
		relativePath: string,
		json: PackageJson,
	): { fullPath: string; relativePath: string } => {
		const dir = join(tempDir, relativePath);
		mkdirSync(dir, { recursive: true });
		const fullPath = join(dir, "package.json");
		writeFileSync(fullPath, JSON.stringify(json, null, 2));
		const relPath =
			relativePath === "." ? "package.json" : `${relativePath}/package.json`;
		return { fullPath, relativePath: relPath };
	};

	const createArgs = (
		fullPath: string,
		config?: NoPrivateWorkspaceDependenciesSettings,
	): PolicyFunctionArguments<
		NoPrivateWorkspaceDependenciesSettings | undefined
	> => ({
		file: fullPath,
		root: tempDir,
		resolve: false,
		config,
	});

	it("should pass for private packages with private workspace dependencies", async () => {
		// Create a private dependency package
		createPackageJson("packages/private-dep", {
			name: "@test/private-dep",
			version: "1.0.0",
			private: true,
		});

		// Create the package being tested (also private)
		const { fullPath } = createPackageJson("packages/my-package", {
			name: "@test/my-package",
			version: "1.0.0",
			private: true,
			dependencies: {
				"@test/private-dep": "workspace:^",
			},
		});

		const result = await NoPrivateWorkspaceDependencies.handler(
			createArgs(fullPath),
		);

		expect(result).toBe(true);
	});

	it("should fail for publishable packages with private workspace dependencies", async () => {
		// Create a private dependency package
		createPackageJson("packages/private-dep", {
			name: "@test/private-dep",
			version: "1.0.0",
			private: true,
		});

		// Create the package being tested (publishable - no private field)
		const { fullPath } = createPackageJson("packages/my-package", {
			name: "@test/my-package",
			version: "1.0.0",
			dependencies: {
				"@test/private-dep": "workspace:^",
			},
		});

		const result = await NoPrivateWorkspaceDependencies.handler(
			createArgs(fullPath),
		);

		expect(result).not.toBe(true);
		if (typeof result === "object") {
			expect(result.errorMessages.join()).toContain("@test/private-dep");
			expect(result.errorMessages.join()).toContain("private packages");
			expect(result.autoFixable).toBe(false);
		}
	});

	it("should pass for publishable packages with publishable workspace dependencies", async () => {
		// Create a publishable dependency package
		createPackageJson("packages/public-dep", {
			name: "@test/public-dep",
			version: "1.0.0",
			// No private field = publishable
		});

		// Create the package being tested (also publishable)
		const { fullPath } = createPackageJson("packages/my-package", {
			name: "@test/my-package",
			version: "1.0.0",
			dependencies: {
				"@test/public-dep": "workspace:^",
			},
		});

		const result = await NoPrivateWorkspaceDependencies.handler(
			createArgs(fullPath),
		);

		expect(result).toBe(true);
	});

	it("should pass for packages with non-workspace dependencies", async () => {
		// Create the package being tested with regular npm dependencies
		const { fullPath } = createPackageJson("packages/my-package", {
			name: "@test/my-package",
			version: "1.0.0",
			dependencies: {
				lodash: "^4.17.21",
				typescript: "~5.0.0",
			},
		});

		const result = await NoPrivateWorkspaceDependencies.handler(
			createArgs(fullPath),
		);

		expect(result).toBe(true);
	});

	it("should not check devDependencies by default", async () => {
		// Create a private dependency package
		createPackageJson("packages/private-dep", {
			name: "@test/private-dep",
			version: "1.0.0",
			private: true,
		});

		// Create a publishable package with private dep in devDependencies only
		const { fullPath } = createPackageJson("packages/my-package", {
			name: "@test/my-package",
			version: "1.0.0",
			devDependencies: {
				"@test/private-dep": "workspace:^",
			},
		});

		const result = await NoPrivateWorkspaceDependencies.handler(
			createArgs(fullPath),
		);

		expect(result).toBe(true);
	});

	it("should check devDependencies when configured", async () => {
		// Create a private dependency package
		createPackageJson("packages/private-dep", {
			name: "@test/private-dep",
			version: "1.0.0",
			private: true,
		});

		// Create a publishable package with private dep in devDependencies
		const { fullPath } = createPackageJson("packages/my-package", {
			name: "@test/my-package",
			version: "1.0.0",
			devDependencies: {
				"@test/private-dep": "workspace:^",
			},
		});

		const result = await NoPrivateWorkspaceDependencies.handler(
			createArgs(fullPath, { checkDevDependencies: true }),
		);

		expect(result).not.toBe(true);
		if (typeof result === "object") {
			expect(result.errorMessages.join()).toContain("@test/private-dep");
		}
	});

	it("should handle multiple private workspace dependencies", async () => {
		// Create two private dependency packages
		createPackageJson("packages/private-dep-1", {
			name: "@test/private-dep-1",
			version: "1.0.0",
			private: true,
		});

		createPackageJson("packages/private-dep-2", {
			name: "@test/private-dep-2",
			version: "1.0.0",
			private: true,
		});

		// Create a publishable package with both
		const { fullPath } = createPackageJson("packages/my-package", {
			name: "@test/my-package",
			version: "1.0.0",
			dependencies: {
				"@test/private-dep-1": "workspace:^",
				"@test/private-dep-2": "workspace:^",
			},
		});

		const result = await NoPrivateWorkspaceDependencies.handler(
			createArgs(fullPath),
		);

		expect(result).not.toBe(true);
		if (typeof result === "object") {
			expect(result.errorMessages.join()).toContain("@test/private-dep-1");
			expect(result.errorMessages.join()).toContain("@test/private-dep-2");
		}
	});

	it("should handle mixed dependencies (some private, some public)", async () => {
		// Create one private and one public dependency
		createPackageJson("packages/private-dep", {
			name: "@test/private-dep",
			version: "1.0.0",
			private: true,
		});

		createPackageJson("packages/public-dep", {
			name: "@test/public-dep",
			version: "1.0.0",
		});

		// Create a publishable package with both
		const { fullPath } = createPackageJson("packages/my-package", {
			name: "@test/my-package",
			version: "1.0.0",
			dependencies: {
				"@test/private-dep": "workspace:^",
				"@test/public-dep": "workspace:^",
			},
		});

		const result = await NoPrivateWorkspaceDependencies.handler(
			createArgs(fullPath),
		);

		expect(result).not.toBe(true);
		if (typeof result === "object") {
			expect(result.errorMessages.join()).toContain("@test/private-dep");
			expect(result.errorMessages.join()).not.toContain("@test/public-dep");
		}
	});

	it("should handle packages in apps directory", async () => {
		// Create a private dependency in apps directory
		createPackageJson("apps/private-app", {
			name: "@test/private-app",
			version: "1.0.0",
			private: true,
		});

		// Create a publishable package depending on it
		const { fullPath } = createPackageJson("packages/my-package", {
			name: "@test/my-package",
			version: "1.0.0",
			dependencies: {
				"@test/private-app": "workspace:^",
			},
		});

		const result = await NoPrivateWorkspaceDependencies.handler(
			createArgs(fullPath),
		);

		expect(result).not.toBe(true);
		if (typeof result === "object") {
			expect(result.errorMessages.join()).toContain("@test/private-app");
		}
	});

	it("should pass for packages with no dependencies", async () => {
		const { fullPath } = createPackageJson("packages/my-package", {
			name: "@test/my-package",
			version: "1.0.0",
		});

		const result = await NoPrivateWorkspaceDependencies.handler(
			createArgs(fullPath),
		);

		expect(result).toBe(true);
	});
});
