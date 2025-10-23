import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "effection";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PolicyFailure } from "../src/policy.js";
import type { PackageJsonHandler } from "../src/policyDefiners/definePackagePolicy.js";
import { definePackagePolicy } from "../src/policyDefiners/definePackagePolicy.js";

describe("definePackagePolicy", () => {
	let testDir: string;
	let packageJsonPath: string;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "repopo-pkg-test-"));
		packageJsonPath = "package.json";
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	it("should read package.json and pass to handler", async () => {
		const packageJson: PackageJson = {
			name: "test-package",
			version: "1.0.0",
			description: "Test package",
		};

		await writeFile(
			join(testDir, packageJsonPath),
			JSON.stringify(packageJson, null, 2),
		);

		let receivedJson: PackageJson | null = null;

		const handler: PackageJsonHandler<PackageJson, undefined> = function* (
			json,
		) {
			yield* (function* () {
				// Minimal yield to satisfy generator requirements
			})();
			receivedJson = json;
			return true;
		};

		const policy = definePackagePolicy("TestPackagePolicy", handler);

		const result = await run(() =>
			policy.handler({
				file: join(testDir, packageJsonPath),
				root: testDir,
				resolve: false,
				config: undefined,
			}),
		);

		expect(result).toBe(true);
		expect(receivedJson).toEqual(packageJson);
		expect(receivedJson?.name).toBe("test-package");
		expect(receivedJson?.version).toBe("1.0.0");
	});

	it("should match package.json files with regex", () => {
		const handler: PackageJsonHandler<PackageJson, undefined> = function* () {
			yield* (function* () {
				// Minimal yield to satisfy generator requirements
			})();
			return true;
		};

		const policy = definePackagePolicy("TestPackagePolicy", handler);

		expect(policy.match).toBeDefined();
		expect("package.json").toMatch(policy.match);
		expect("src/package.json").toMatch(policy.match);
		expect("packages/foo/package.json").toMatch(policy.match);
		expect("package.txt").not.toMatch(policy.match);
		expect("packages.json").not.toMatch(policy.match);
	});

	it("should handle valid package.json parsing", async () => {
		const complexPackageJson: PackageJson = {
			name: "@scope/package-name",
			version: "2.5.1",
			description: "A complex package",
			main: "dist/index.js",
			types: "dist/index.d.ts",
			scripts: {
				build: "tsc",
				test: "vitest",
			},
			dependencies: {
				"some-dep": "^1.0.0",
			},
			devDependencies: {
				typescript: "~5.0.0",
			},
		};

		await writeFile(
			join(testDir, packageJsonPath),
			JSON.stringify(complexPackageJson, null, 2),
		);

		let receivedJson: PackageJson | null = null;

		const handler: PackageJsonHandler<PackageJson, undefined> = function* (
			json,
		) {
			yield* (function* () {
				// Minimal yield to satisfy generator requirements
			})();
			receivedJson = json;
			return true;
		};

		const policy = definePackagePolicy("ComplexPackagePolicy", handler);

		await run(() =>
			policy.handler({
				file: join(testDir, packageJsonPath),
				root: testDir,
				resolve: false,
				config: undefined,
			}),
		);

		expect(receivedJson).toEqual(complexPackageJson);
		expect(receivedJson?.scripts?.build).toBe("tsc");
		expect(receivedJson?.dependencies).toHaveProperty("some-dep");
	});

	it("should propagate handler results correctly", async () => {
		const packageJson: PackageJson = {
			name: "failing-package",
			version: "1.0.0",
		};

		await writeFile(
			join(testDir, packageJsonPath),
			JSON.stringify(packageJson, null, 2),
		);

		const handler: PackageJsonHandler<PackageJson, undefined> = function* (
			json,
			{ file },
		) {
			yield* (function* () {
				// Minimal yield to satisfy generator requirements
			})();
			const failure: PolicyFailure = {
				name: "TestPackagePolicy",
				file,
				errorMessage: `Package ${json.name} failed validation`,
				autoFixable: false,
			};
			return failure;
		};

		const policy = definePackagePolicy("TestPackagePolicy", handler);

		const result = await run(() =>
			policy.handler({
				file: join(testDir, packageJsonPath),
				root: testDir,
				resolve: false,
				config: undefined,
			}),
		);

		expect(result).toMatchObject({
			name: "TestPackagePolicy",
			errorMessage: "Package failing-package failed validation",
			autoFixable: false,
		});
	});

	it("should work with custom PackageJson types", async () => {
		interface CustomPackageJson extends PackageJson {
			customField?: string;
		}

		const customPackageJson: CustomPackageJson = {
			name: "custom-package",
			version: "1.0.0",
			customField: "custom-value",
		};

		await writeFile(
			join(testDir, packageJsonPath),
			JSON.stringify(customPackageJson, null, 2),
		);

		let receivedCustomField: string | undefined;

		const handler: PackageJsonHandler<CustomPackageJson, undefined> =
			function* (json) {
				yield* (function* () {
					// Minimal yield to satisfy generator requirements
				})();
				receivedCustomField = json.customField;
				return true;
			};

		const policy = definePackagePolicy<CustomPackageJson>(
			"CustomPackagePolicy",
			handler,
		);

		await run(() =>
			policy.handler({
				file: join(testDir, packageJsonPath),
				root: testDir,
				resolve: false,
				config: undefined,
			}),
		);

		expect(receivedCustomField).toBe("custom-value");
	});

	it("should pass config to handler", async () => {
		interface TestConfig {
			requiredVersion: string;
		}

		const packageJson: PackageJson = {
			name: "config-test-package",
			version: "2.0.0",
		};

		await writeFile(
			join(testDir, packageJsonPath),
			JSON.stringify(packageJson, null, 2),
		);

		let receivedConfig: TestConfig | undefined;

		const handler: PackageJsonHandler<PackageJson, TestConfig> = function* (
			json,
			{ config },
		) {
			yield* (function* () {
				// Minimal yield to satisfy generator requirements
			})();
			receivedConfig = config;
			return config?.requiredVersion === json.version;
		};

		const policy = definePackagePolicy<PackageJson, TestConfig>(
			"ConfigPackagePolicy",
			handler,
		);

		const result = await run(() =>
			policy.handler({
				file: join(testDir, packageJsonPath),
				root: testDir,
				resolve: false,
				config: { requiredVersion: "2.0.0" },
			}),
		);

		expect(result).toBe(true);
		expect(receivedConfig).toEqual({ requiredVersion: "2.0.0" });
	});

	it("should handle package.json with minimal fields", async () => {
		const minimalPackageJson: PackageJson = {
			name: "minimal",
			version: "0.0.1",
		};

		await writeFile(
			join(testDir, packageJsonPath),
			JSON.stringify(minimalPackageJson, null, 2),
		);

		const handler: PackageJsonHandler<PackageJson, undefined> = function* (
			json,
		) {
			yield* (function* () {
				// Minimal yield to satisfy generator requirements
			})();
			return json.name === "minimal" && json.version === "0.0.1";
		};

		const policy = definePackagePolicy("MinimalPackagePolicy", handler);

		const result = await run(() =>
			policy.handler({
				file: join(testDir, packageJsonPath),
				root: testDir,
				resolve: false,
				config: undefined,
			}),
		);

		expect(result).toBe(true);
	});

	it("should receive all policy function arguments", async () => {
		const packageJson: PackageJson = {
			name: "args-test",
			version: "1.0.0",
		};

		await writeFile(
			join(testDir, packageJsonPath),
			JSON.stringify(packageJson, null, 2),
		);

		let receivedFile: string | undefined;
		let receivedRoot: string | undefined;
		let receivedResolve: boolean | undefined;

		const handler: PackageJsonHandler<PackageJson, undefined> = function* (
			_json,
			{ file, root, resolve },
		) {
			yield* (function* () {
				// Minimal yield to satisfy generator requirements
			})();
			receivedFile = file;
			receivedRoot = root;
			receivedResolve = resolve;
			return true;
		};

		const policy = definePackagePolicy("ArgsPackagePolicy", handler);

		await run(() =>
			policy.handler({
				file: join(testDir, packageJsonPath),
				root: testDir,
				resolve: true,
				config: undefined,
			}),
		);

		expect(receivedFile).toBe(join(testDir, packageJsonPath));
		expect(receivedRoot).toBe(testDir);
		expect(receivedResolve).toBe(true);
	});

	it("should handle package.json with complex nested structures", async () => {
		const complexPackageJson: PackageJson = {
			name: "complex-nested",
			version: "1.0.0",
			exports: {
				".": {
					types: "./dist/index.d.ts",
					import: "./dist/index.js",
				},
				"./utils": {
					types: "./dist/utils.d.ts",
					import: "./dist/utils.js",
				},
			},
			workspaces: ["packages/*"],
		};

		await writeFile(
			join(testDir, packageJsonPath),
			JSON.stringify(complexPackageJson, null, 2),
		);

		let receivedExports: PackageJson["exports"];
		let receivedWorkspaces: PackageJson["workspaces"];

		const handler: PackageJsonHandler<PackageJson, undefined> = function* (
			json,
		) {
			yield* (function* () {
				// Minimal yield to satisfy generator requirements
			})();
			receivedExports = json.exports;
			receivedWorkspaces = json.workspaces;
			return true;
		};

		const policy = definePackagePolicy("NestedPackagePolicy", handler);

		await run(() =>
			policy.handler({
				file: join(testDir, packageJsonPath),
				root: testDir,
				resolve: false,
				config: undefined,
			}),
		);

		expect(receivedExports).toBeDefined();
		expect(receivedWorkspaces).toEqual(["packages/*"]);
	});

	it("should set correct policy name", () => {
		const handler: PackageJsonHandler<PackageJson, undefined> = function* () {
			yield* (function* () {
				// Minimal yield to satisfy generator requirements
			})();
			return true;
		};

		const policy = definePackagePolicy("MyCustomPackagePolicy", handler);

		expect(policy.name).toBe("MyCustomPackagePolicy");
	});
});
