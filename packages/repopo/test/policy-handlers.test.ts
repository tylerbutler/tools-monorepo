import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { run } from "effection";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
	PolicyFailure,
	PolicyFixResult,
	PolicyHandler,
	PolicyStandaloneResolver,
} from "../src/policy.js";

describe("Policy Handlers - Dual Mode Support", () => {
	let testDir: string;
	let testFile: string;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "repopo-test-"));
		testFile = "test.txt";
		await writeFile(join(testDir, testFile), "test content");
	});

	afterEach(async () => {
		// Clean up test directory if needed
	});

	describe("Promise-based handlers", () => {
		it("should support Promise-based handler returning true", async () => {
			const handler: PolicyHandler = async ({ file }) => {
				expect(file).toBe(testFile);
				return true;
			};

			const result = await handler({
				file: testFile,
				root: testDir,
				resolve: false,
				config: undefined,
			});

			expect(result).toBe(true);
		});

		it("should support Promise-based handler returning PolicyFailure", async () => {
			const handler: PolicyHandler = async ({ file }) => {
				const failure: PolicyFailure = {
					name: "TestPolicy",
					file,
					errorMessage: "Test failure",
					autoFixable: false,
				};
				return failure;
			};

			const result = await handler({
				file: testFile,
				root: testDir,
				resolve: false,
				config: undefined,
			});

			expect(result).toMatchObject({
				name: "TestPolicy",
				file: testFile,
				errorMessage: "Test failure",
				autoFixable: false,
			});
		});

		it("should support Promise-based handler with resolve flag", async () => {
			const handler: PolicyHandler = async ({ file, resolve }) => {
				if (resolve) {
					const fixResult: PolicyFixResult = {
						name: "TestPolicy",
						file,
						resolved: true,
						errorMessage: "Fixed",
					};
					return fixResult;
				}

				const failure: PolicyFailure = {
					name: "TestPolicy",
					file,
					errorMessage: "Needs fix",
					autoFixable: true,
				};
				return failure;
			};

			// Test without resolve
			const failureResult = await handler({
				file: testFile,
				root: testDir,
				resolve: false,
				config: undefined,
			});

			expect(failureResult).toMatchObject({
				name: "TestPolicy",
				errorMessage: "Needs fix",
				autoFixable: true,
			});

			// Test with resolve
			const fixResult = await handler({
				file: testFile,
				root: testDir,
				resolve: true,
				config: undefined,
			});

			expect(fixResult).toMatchObject({
				name: "TestPolicy",
				resolved: true,
				errorMessage: "Fixed",
			});
		});

		it("should support Promise-based handler with config", async () => {
			interface TestConfig {
				threshold: number;
			}

			const handler: PolicyHandler<TestConfig> = async ({ config }) => {
				expect(config?.threshold).toBe(100);
				return true;
			};

			const result = await handler({
				file: testFile,
				root: testDir,
				resolve: false,
				config: { threshold: 100 },
			});

			expect(result).toBe(true);
		});
	});

	describe("Effection Operation-based handlers", () => {
		it("should support Operation-based handler returning true", async () => {
			const handler: PolicyHandler = function* ({ file }) {
				yield* (function* () {
					// Minimal yield to satisfy generator requirements
				})();
				expect(file).toBe(testFile);
				return true;
			};

			const result = await run(() =>
				handler({
					file: testFile,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			);

			expect(result).toBe(true);
		});

		it("should support Operation-based handler returning PolicyFailure", async () => {
			const handler: PolicyHandler = function* ({ file }) {
				yield* (function* () {
					// Minimal yield to satisfy generator requirements
				})();
				const failure: PolicyFailure = {
					name: "TestPolicy",
					file,
					errorMessage: "Test failure from Operation",
					autoFixable: false,
				};
				return failure;
			};

			const result = await run(() =>
				handler({
					file: testFile,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			);

			expect(result).toMatchObject({
				name: "TestPolicy",
				file: testFile,
				errorMessage: "Test failure from Operation",
				autoFixable: false,
			});
		});

		it("should support Operation-based handler with resolve flag", async () => {
			const handler: PolicyHandler = function* ({ file, resolve }) {
				yield* (function* () {
					// Minimal yield to satisfy generator requirements
				})();
				if (resolve) {
					const fixResult: PolicyFixResult = {
						name: "TestPolicy",
						file,
						resolved: true,
						errorMessage: "Fixed with Operation",
					};
					return fixResult;
				}

				const failure: PolicyFailure = {
					name: "TestPolicy",
					file,
					errorMessage: "Needs fix",
					autoFixable: true,
				};
				return failure;
			};

			// Test without resolve
			const failureResult = await run(() =>
				handler({
					file: testFile,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			);

			expect(failureResult).toMatchObject({
				name: "TestPolicy",
				errorMessage: "Needs fix",
				autoFixable: true,
			});

			// Test with resolve
			const fixResult = await run(() =>
				handler({
					file: testFile,
					root: testDir,
					resolve: true,
					config: undefined,
				}),
			);

			expect(fixResult).toMatchObject({
				name: "TestPolicy",
				resolved: true,
				errorMessage: "Fixed with Operation",
			});
		});

		it("should support Operation-based handler with config", async () => {
			interface TestConfig {
				maxSize: number;
			}

			const handler: PolicyHandler<TestConfig> = function* ({ config }) {
				yield* (function* () {
					// Minimal yield to satisfy generator requirements
				})();
				expect(config?.maxSize).toBe(1000);
				return true;
			};

			const result = await run(() =>
				handler({
					file: testFile,
					root: testDir,
					resolve: false,
					config: { maxSize: 1000 },
				}),
			);

			expect(result).toBe(true);
		});

		it("should support Operation-based handler with yielding", async () => {
			const handler: PolicyHandler = function* ({ file }) {
				// Simulate async work with yield
				const result = yield* (function* () {
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
					return file.length > 0;
				})();

				if (result) {
					return true;
				}

				const failure: PolicyFailure = {
					name: "TestPolicy",
					file,
					errorMessage: "File is empty",
					autoFixable: false,
				};
				return failure;
			};

			const result = await run(() =>
				handler({
					file: testFile,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			);

			expect(result).toBe(true);
		});
	});

	describe("Hybrid usage scenarios", () => {
		it("should work with both handler types in the same codebase", async () => {
			const promiseHandler: PolicyHandler = async () => {
				return true;
			};

			const operationHandler: PolicyHandler = function* () {
				yield* (function* () {
					// Minimal yield to satisfy generator requirements
				})();
				return true;
			};

			const promiseResult = await promiseHandler({
				file: testFile,
				root: testDir,
				resolve: false,
				config: undefined,
			});

			const operationResult = await run(() =>
				operationHandler({
					file: testFile,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			);

			expect(promiseResult).toBe(true);
			expect(operationResult).toBe(true);
		});
	});
});

describe("Policy Resolvers - Dual Mode Support", () => {
	let testDir: string;
	let testFile: string;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "repopo-test-"));
		testFile = "test.txt";
		await writeFile(join(testDir, testFile), "test content");
	});

	describe("Promise-based resolvers", () => {
		it("should support Promise-based resolver", async () => {
			const resolver: PolicyStandaloneResolver = async ({ file }) => {
				const result: PolicyFixResult = {
					name: "TestPolicy",
					file,
					resolved: true,
					errorMessage: "Fixed successfully",
				};
				return result;
			};

			const result = await resolver({
				file: testFile,
				root: testDir,
				config: undefined,
			});

			expect(result).toMatchObject({
				name: "TestPolicy",
				file: testFile,
				resolved: true,
				errorMessage: "Fixed successfully",
			});
		});

		it("should support Promise-based resolver with failure", async () => {
			const resolver: PolicyStandaloneResolver = async ({ file }) => {
				const result: PolicyFixResult = {
					name: "TestPolicy",
					file,
					resolved: false,
					errorMessage: "Could not fix",
				};
				return result;
			};

			const result = await resolver({
				file: testFile,
				root: testDir,
				config: undefined,
			});

			expect(result).toMatchObject({
				resolved: false,
				errorMessage: "Could not fix",
			});
		});
	});

	describe("Effection Operation-based resolvers", () => {
		it("should support Operation-based resolver", async () => {
			const resolver: PolicyStandaloneResolver = function* ({ file }) {
				yield* (function* () {
					// Minimal yield to satisfy generator requirements
				})();
				const result: PolicyFixResult = {
					name: "TestPolicy",
					file,
					resolved: true,
					errorMessage: "Fixed with Operation",
				};
				return result;
			};

			const result = await run(() =>
				resolver({
					file: testFile,
					root: testDir,
					config: undefined,
				}),
			);

			expect(result).toMatchObject({
				name: "TestPolicy",
				file: testFile,
				resolved: true,
				errorMessage: "Fixed with Operation",
			});
		});

		it("should support Operation-based resolver with yielding", async () => {
			const resolver: PolicyStandaloneResolver = function* ({ file }) {
				// Simulate complex async work
				const canFix = yield* (function* () {
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
					return true;
				})();

				const result: PolicyFixResult = {
					name: "TestPolicy",
					file,
					resolved: canFix,
					errorMessage: canFix ? "Fixed" : "Cannot fix",
				};
				return result;
			};

			const result = await run(() =>
				resolver({
					file: testFile,
					root: testDir,
					config: undefined,
				}),
			);

			expect(result).toMatchObject({
				resolved: true,
				errorMessage: "Fixed",
			});
		});
	});
});
