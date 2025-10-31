import { describe, expect, it } from "vitest";
import { TestDataBuilder, TestHelpers } from "../helpers/testUtils.js";

describe("TestDataBuilder", () => {
	describe("createMockBuildPackage", () => {
		it("should create a mock package with default values", () => {
			const mockPackage = TestDataBuilder.createMockBuildPackage();

			expect(mockPackage.name).toBe("test-package");
			expect(mockPackage.nameColored).toBe("test-package");
			expect(mockPackage.packagePath).toBe("/test/package");
			expect(mockPackage.isReleaseGroupRoot).toBe(false);
			expect(mockPackage.packageJson.name).toBe("test-package");
			expect(mockPackage.packageJson.version).toBe("1.0.0");
		});

		it("should allow overriding package name", () => {
			const mockPackage = TestDataBuilder.createMockBuildPackage({
				name: "custom-package",
			});

			expect(mockPackage.name).toBe("custom-package");
			expect(mockPackage.nameColored).toBe("custom-package");
			expect(mockPackage.packageJson.name).toBe("custom-package");
		});

		it("should allow overriding package path", () => {
			const mockPackage = TestDataBuilder.createMockBuildPackage({
				packagePath: "/custom/path",
			});

			expect(mockPackage.packagePath).toBe("/custom/path");
		});

		it("should allow overriding isReleaseGroupRoot", () => {
			const mockPackage = TestDataBuilder.createMockBuildPackage({
				isReleaseGroupRoot: true,
			});

			expect(mockPackage.isReleaseGroupRoot).toBe(true);
		});

		it("should allow overriding packageJson", () => {
			const customPackageJson = {
				name: "custom-package",
				version: "2.0.0",
				scripts: {
					"custom-script": "echo 'custom'",
				},
			};

			const mockPackage = TestDataBuilder.createMockBuildPackage({
				packageJson: customPackageJson,
			});

			expect(mockPackage.packageJson).toEqual(customPackageJson);
		});

		it("should provide a working getScript method", () => {
			const mockPackage = TestDataBuilder.createMockBuildPackage();

			expect(mockPackage.getScript("build")).toBe("tsc");
			expect(mockPackage.getScript("test")).toBe("vitest");
			expect(mockPackage.getScript("nonexistent")).toBeUndefined();
		});
	});

	describe("createMockBuildContext", () => {
		it("should create a mock context with default values", () => {
			const mockContext = TestDataBuilder.createMockBuildContext();

			expect(mockContext.repoRoot).toBe("/test/repo");
			expect(mockContext.gitRoot).toBe("/test/repo");
			expect(mockContext.sailConfig).toBeDefined();
			expect(mockContext.sailConfig.taskDefinitions).toEqual({});
			expect(mockContext.log).toBeDefined();
		});

		it("should allow overriding values", () => {
			const mockContext = TestDataBuilder.createMockBuildContext({
				repoRoot: "/custom/repo",
				sailConfig: {
					taskDefinitions: {
						build: { dependsOn: [] },
					},
				},
			});

			expect(mockContext.repoRoot).toBe("/custom/repo");
			expect(mockContext.sailConfig.taskDefinitions.build).toEqual({
				dependsOn: [],
			});
		});

		it("should provide working logger methods", () => {
			const mockContext = TestDataBuilder.createMockBuildContext();

			// These should not throw
			expect(() => mockContext.log.info("test")).not.toThrow();
			expect(() => mockContext.log.warn("test")).not.toThrow();
			expect(() => mockContext.log.error("test")).not.toThrow();
			expect(() => mockContext.log.verbose("test")).not.toThrow();
			expect(() => mockContext.log.debug("test")).not.toThrow();
		});
	});

	describe("createPackageJson", () => {
		it("should create a package.json with default values", () => {
			const packageJson = TestDataBuilder.createPackageJson();

			expect(packageJson.name).toBe("test-package");
			expect(packageJson.version).toBe("1.0.0");
			expect(packageJson.scripts).toEqual({
				build: "tsc",
				test: "vitest",
				lint: "biome lint",
			});
		});

		it("should allow overriding values", () => {
			const packageJson = TestDataBuilder.createPackageJson({
				name: "custom-package",
				version: "2.0.0",
				scripts: {
					"custom-script": "echo 'custom'",
				},
			});

			expect(packageJson.name).toBe("custom-package");
			expect(packageJson.version).toBe("2.0.0");
			expect(packageJson.scripts).toEqual({
				"custom-script": "echo 'custom'",
			});
		});

		it("should allow adding sail configuration", () => {
			const packageJson = TestDataBuilder.createPackageJson({
				sail: {
					tasks: {
						build: { dependsOn: ["^build"] },
					},
				},
			});

			expect(packageJson.sail?.tasks?.build).toEqual({ dependsOn: ["^build"] });
		});
	});

	describe("createTaskDefinitions", () => {
		it("should create task definitions with expected structure", () => {
			const taskDefs = TestDataBuilder.createTaskDefinitions();

			expect(taskDefs.build).toEqual({
				dependsOn: ["^build"],
				script: true,
				before: [],
				children: [],
				after: [],
			});

			expect(taskDefs.test).toEqual({
				dependsOn: ["build"],
				script: true,
				before: [],
				children: [],
				after: [],
			});
		});
	});
});

describe("TestHelpers", () => {
	describe("createTempDir", () => {
		it("should return a string path", () => {
			const tempDir = TestHelpers.createTempDir();
			expect(typeof tempDir).toBe("string");
			expect(tempDir).toMatch(/^\/tmp\/test-/);
		});

		it("should return different paths on multiple calls", () => {
			const tempDir1 = TestHelpers.createTempDir();
			const tempDir2 = TestHelpers.createTempDir();
			expect(tempDir1).not.toBe(tempDir2);
		});
	});

	describe("assertThrows", () => {
		it("should catch thrown errors", async () => {
			const thrownError = await TestHelpers.assertThrows(() => {
				throw new Error("Test error");
			});

			expect(thrownError.message).toBe("Test error");
		});

		it("should catch thrown errors with expected message", async () => {
			const thrownError = await TestHelpers.assertThrows(() => {
				throw new Error("Test error message");
			}, "Test error");

			expect(thrownError.message).toBe("Test error message");
		});

		it("should throw if function does not throw", async () => {
			// TODO: Fix this test - the assertThrows function behavior needs clarification
			try {
				await TestHelpers.assertThrows(() => {
					// Function that doesn't throw
				});
				throw new Error("Should not reach this point");
			} catch (error) {
				expect(error.message).toBe("Expected function to throw, but it didn't");
			}
		});

		it("should throw if error message doesn't match", async () => {
			await expect(async () => {
				await TestHelpers.assertThrows(() => {
					throw new Error("Different error");
				}, "Expected error");
			}).rejects.toThrow("Expected error message to contain");
		});

		it("should handle async functions", async () => {
			const thrownError = await TestHelpers.assertThrows(async () => {
				throw new Error("Async error");
			});

			expect(thrownError.message).toBe("Async error");
		});
	});

	describe("waitFor", () => {
		it("should resolve immediately if condition is true", async () => {
			const start = Date.now();
			await TestHelpers.waitFor(() => true);
			const elapsed = Date.now() - start;

			expect(elapsed).toBeLessThan(50); // Should be very fast
		});

		it("should wait for condition to become true", async () => {
			let counter = 0;
			const start = Date.now();

			await TestHelpers.waitFor(
				() => {
					counter++;
					return counter >= 3;
				},
				100,
				10,
			);

			const elapsed = Date.now() - start;
			expect(counter).toBeGreaterThanOrEqual(3);
			expect(elapsed).toBeGreaterThanOrEqual(10); // Should have waited at least one interval
		});

		it("should timeout if condition never becomes true", async () => {
			await expect(async () => {
				await TestHelpers.waitFor(() => false, 50, 10);
			}).rejects.toThrow("Condition was not met within timeout");
		});

		it("should handle async conditions", async () => {
			let counter = 0;

			await TestHelpers.waitFor(
				async () => {
					counter++;
					return counter >= 2;
				},
				100,
				10,
			);

			expect(counter).toBeGreaterThanOrEqual(2);
		});
	});
});
