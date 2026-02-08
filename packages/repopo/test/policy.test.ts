import { describe, expect, it } from "vitest";
import {
	convertLegacyResult,
	convertToLegacyResult,
	DefaultPolicies,
	isPolicyError,
	isPolicyFailure,
	isPolicyFixResult,
	Policy,
	type PolicyError,
	type PolicyFailure,
	type PolicyFixResult,
	type PolicyHandler,
	type PolicyHandlerResult,
} from "../src/policy.js";

describe("Policy Module", () => {
	describe("isPolicyFixResult", () => {
		it("should return true for PolicyFixResult objects", () => {
			const fixResult: PolicyFixResult = {
				name: "TestPolicy",
				file: "test.ts",
				resolved: true,
				errorMessages: [],
			};

			expect(isPolicyFixResult(fixResult)).toBe(true);
		});

		it("should return true for PolicyFixResult with resolved: false", () => {
			const fixResult: PolicyFixResult = {
				name: "TestPolicy",
				file: "test.ts",
				resolved: false,
				errorMessages: ["Error occurred"],
			};

			expect(isPolicyFixResult(fixResult)).toBe(true);
		});

		it("should return false for PolicyFailure without resolved property", () => {
			const failure: PolicyFailure = {
				name: "TestPolicy",
				file: "test.ts",
				autoFixable: true,
				errorMessages: ["Error message"],
			};

			expect(isPolicyFixResult(failure)).toBe(false);
		});

		it("should return false for non-object values", () => {
			expect(isPolicyFixResult(true)).toBe(false);
			expect(isPolicyFixResult(false)).toBe(false);
			expect(isPolicyFixResult("string")).toBe(false);
			expect(isPolicyFixResult(123)).toBe(false);
			expect(isPolicyFixResult(null)).toBe(false);
			expect(isPolicyFixResult(undefined)).toBe(false);
		});

		it("should return false for arrays", () => {
			expect(isPolicyFixResult([])).toBe(false);
			expect(isPolicyFixResult([{ resolved: true }])).toBe(false);
		});
	});

	describe("Policy abstract class", () => {
		class TestPolicy extends Policy<{ setting: string }> {}

		it("should be instantiable with all parameters", () => {
			const handler: PolicyHandler<{
				setting: string;
			}> = async (): Promise<PolicyHandlerResult> => true;
			const resolver = async (): Promise<PolicyFixResult> => ({
				name: "TestPolicy",
				file: "test.ts",
				resolved: true,
				errorMessages: [],
			});

			const policy = new TestPolicy({
				name: "TestPolicy",
				description: "A test policy for TypeScript files",
				match: /\.ts$/,
				handler,
				defaultConfig: { setting: "default" },
				resolver,
			});

			expect(policy.name).toBe("TestPolicy");
			expect(policy.description).toBe("A test policy for TypeScript files");
			expect(policy.match).toEqual(/\.ts$/);
			expect(policy.handler).toBe(handler);
			expect(policy.defaultConfig).toEqual({ setting: "default" });
			expect(policy.resolver).toBe(resolver);
		});

		it("should be instantiable with minimal parameters", () => {
			const handler: PolicyHandler<
				undefined
			> = async (): Promise<PolicyHandlerResult> => true;

			class MinimalPolicy extends Policy<undefined> {}

			const policy = new MinimalPolicy({
				name: "MinimalPolicy",
				description: "A minimal policy for package.json files",
				match: /package\.json$/,
				handler,
			});

			expect(policy.name).toBe("MinimalPolicy");
			expect(policy.description).toBe(
				"A minimal policy for package.json files",
			);
			expect(policy.match).toEqual(/package\.json$/);
			expect(policy.handler).toBe(handler);
			expect(policy.defaultConfig).toBeUndefined();
			expect(policy.resolver).toBeUndefined();
		});

		it("should match files correctly using the regex", () => {
			const handler: PolicyHandler<
				undefined
			> = async (): Promise<PolicyHandlerResult> => true;

			class MinimalPolicy extends Policy<undefined> {}

			const policy = new MinimalPolicy({
				name: "TypeScriptPolicy",
				description: "A policy for TypeScript files",
				match: /\.(ts|tsx)$/,
				handler,
			});

			expect(policy.match.test("component.ts")).toBe(true);
			expect(policy.match.test("component.tsx")).toBe(true);
			expect(policy.match.test("component.js")).toBe(false);
			expect(policy.match.test("component.css")).toBe(false);
		});

		it("should allow calling the handler", async () => {
			const handler: PolicyHandler<{ threshold: number }> = async ({
				config,
			}): Promise<PolicyHandlerResult> => {
				if (!config || config.threshold < 0) {
					return {
						name: "TestPolicy",
						file: "test.ts",
						autoFixable: false,
						errorMessages: ["Invalid threshold"],
					};
				}
				return true;
			};

			class ConfigurablePolicy extends Policy<{ threshold: number }> {}

			const policy = new ConfigurablePolicy({
				name: "ConfigurablePolicy",
				description: "A configurable policy",
				match: /\.ts$/,
				handler,
				defaultConfig: { threshold: 10 },
			});

			const passResult = await policy.handler({
				file: "test.ts",
				root: "/project",
				resolve: false,
				config: { threshold: 5 },
			});
			expect(passResult).toBe(true);

			const failResult = await policy.handler({
				file: "test.ts",
				root: "/project",
				resolve: false,
				config: { threshold: -1 },
			});
			expect(failResult).not.toBe(true);
		});
	});

	describe("DefaultPolicies", () => {
		it("should contain expected policies", () => {
			expect(DefaultPolicies).toBeInstanceOf(Array);
			expect(DefaultPolicies.length).toBeGreaterThan(0);
		});

		it("should have policies with required properties", () => {
			for (const policy of DefaultPolicies) {
				expect(policy.name).toBeDefined();
				expect(typeof policy.name).toBe("string");
				expect(policy.match).toBeDefined();
				expect(policy.match).toBeInstanceOf(RegExp);
				expect(policy.handler).toBeDefined();
				expect(typeof policy.handler).toBe("function");
			}
		});

		it("should include NoJsFileExtensions policy", () => {
			const hasPolicy = DefaultPolicies.some(
				(p) => p.name === "NoJsFileExtensions",
			);
			expect(hasPolicy).toBe(true);
		});

		it("should include PackageJsonRepoDirectoryProperty policy", () => {
			const hasPolicy = DefaultPolicies.some(
				(p) => p.name === "PackageJsonRepoDirectoryProperty",
			);
			expect(hasPolicy).toBe(true);
		});

		it("should include PackageJsonSorted policy", () => {
			const hasPolicy = DefaultPolicies.some(
				(p) => p.name === "PackageJsonSorted",
			);
			expect(hasPolicy).toBe(true);
		});

		// Note: PackageScripts was removed from DefaultPolicies as part of API simplification.
		// It was split into focused policies: RequiredScripts, ExactScripts,
		// MutuallyExclusiveScripts, ConditionalScripts, ScriptContains
	});

	describe("isPolicyError", () => {
		it("should return true for PolicyError objects", () => {
			const error: PolicyError = {
				error: "Something failed",
				fixable: true,
			};
			expect(isPolicyError(error)).toBe(true);
		});

		it("should return true for PolicyError with all optional fields", () => {
			const error: PolicyError = {
				error: "Something failed",
				fixable: true,
				fixed: false,
				manualFix: "Run npm install",
			};
			expect(isPolicyError(error)).toBe(true);
		});

		it("should return true for minimal PolicyError", () => {
			const error: PolicyError = { error: "Failed" };
			expect(isPolicyError(error)).toBe(true);
		});

		it("should return false for non-object values", () => {
			expect(isPolicyError(true)).toBe(false);
			expect(isPolicyError(false)).toBe(false);
			expect(isPolicyError("string")).toBe(false);
			expect(isPolicyError(123)).toBe(false);
			expect(isPolicyError(null)).toBe(false);
			expect(isPolicyError(undefined)).toBe(false);
		});

		it("should return false for objects without error string", () => {
			expect(isPolicyError({ error: 123 })).toBe(false);
			expect(isPolicyError({ error: true })).toBe(false);
			expect(isPolicyError({ name: "test" })).toBe(false);
		});

		it("should return false for PolicyFailure objects", () => {
			const failure: PolicyFailure = {
				name: "Test",
				file: "test.ts",
				errorMessages: ["Error"],
			};
			expect(isPolicyError(failure)).toBe(false);
		});
	});

	describe("isPolicyFailure", () => {
		it("should return true for PolicyFailure objects", () => {
			const failure: PolicyFailure = {
				name: "TestPolicy",
				file: "test.ts",
				errorMessages: ["Error"],
			};
			expect(isPolicyFailure(failure)).toBe(true);
		});

		it("should return true for PolicyFixResult objects (which extend PolicyFailure)", () => {
			const fixResult: PolicyFixResult = {
				name: "TestPolicy",
				file: "test.ts",
				resolved: true,
				errorMessages: ["Fixed"],
			};
			expect(isPolicyFailure(fixResult)).toBe(true);
		});

		it("should return false for non-object values", () => {
			expect(isPolicyFailure(true)).toBe(false);
			expect(isPolicyFailure("string")).toBe(false);
			expect(isPolicyFailure(null)).toBe(false);
			expect(isPolicyFailure(undefined)).toBe(false);
		});

		it("should return false for objects without errorMessages array", () => {
			expect(isPolicyFailure({ errorMessages: "not an array" })).toBe(false);
			expect(isPolicyFailure({ name: "test" })).toBe(false);
		});
	});

	describe("convertLegacyResult", () => {
		it("should pass through true unchanged", () => {
			expect(convertLegacyResult(true, "test.ts")).toBe(true);
		});

		it("should pass through PolicyError unchanged", () => {
			const error: PolicyError = {
				error: "Something failed",
				fixable: true,
				fixed: false,
			};
			expect(convertLegacyResult(error, "test.ts")).toBe(error);
		});

		it("should convert PolicyFailure to PolicyError", () => {
			const failure: PolicyFailure = {
				name: "TestPolicy",
				file: "test.ts",
				autoFixable: true,
				errorMessages: ["Error 1", "Error 2"],
				manualFix: "Fix manually",
			};
			const result = convertLegacyResult(failure, "test.ts");

			expect(result).not.toBe(true);
			if (result !== true) {
				expect(result.error).toBe("Error 1; Error 2");
				expect(result.fixable).toBe(true);
				expect(result.fixed).toBeUndefined();
				expect(result.manualFix).toBe("Fix manually");
			}
		});

		it("should convert PolicyFixResult to PolicyError with fixed field", () => {
			const fixResult: PolicyFixResult = {
				name: "TestPolicy",
				file: "test.ts",
				resolved: true,
				errorMessages: ["Fixed the issue"],
			};
			const result = convertLegacyResult(fixResult, "test.ts");

			expect(result).not.toBe(true);
			if (result !== true) {
				expect(result.error).toBe("Fixed the issue");
				expect(result.fixed).toBe(true);
			}
		});

		it("should convert PolicyFixResult with resolved=false", () => {
			const fixResult: PolicyFixResult = {
				name: "TestPolicy",
				file: "test.ts",
				resolved: false,
				errorMessages: ["Could not fix"],
			};
			const result = convertLegacyResult(fixResult, "test.ts");

			expect(result).not.toBe(true);
			if (result !== true) {
				expect(result.fixed).toBe(false);
			}
		});

		it("should handle empty errorMessages array", () => {
			const failure: PolicyFailure = {
				name: "TestPolicy",
				file: "test.ts",
				errorMessages: [],
			};
			const result = convertLegacyResult(failure, "test.ts");

			expect(result).not.toBe(true);
			if (result !== true) {
				// Empty array joins to empty string, which is falsy, so ?? kicks in
				expect(result.error).toBe("");
			}
		});

		it("should default fixable to false when autoFixable is undefined", () => {
			const failure: PolicyFailure = {
				name: "TestPolicy",
				file: "test.ts",
				errorMessages: ["Error"],
			};
			const result = convertLegacyResult(failure, "test.ts");

			expect(result).not.toBe(true);
			if (result !== true) {
				expect(result.fixable).toBe(false);
			}
		});
	});

	describe("convertToLegacyResult", () => {
		it("should convert PolicyError to PolicyFailure", () => {
			const error: PolicyError = {
				error: "Something went wrong",
				fixable: true,
				manualFix: "Fix it",
			};
			const result = convertToLegacyResult(error, "TestPolicy", "test.ts");

			expect(result).toHaveProperty("name", "TestPolicy");
			expect(result).toHaveProperty("file", "test.ts");
			expect(result).toHaveProperty("autoFixable", true);
			expect(result).toHaveProperty("errorMessages", ["Something went wrong"]);
			expect(result).toHaveProperty("manualFix", "Fix it");
			expect(result).not.toHaveProperty("resolved");
		});

		it("should convert PolicyError with fixed=true to PolicyFixResult", () => {
			const error: PolicyError = {
				error: "Fixed it",
				fixable: true,
				fixed: true,
			};
			const result = convertToLegacyResult(error, "TestPolicy", "test.ts");

			expect(result).toHaveProperty("resolved", true);
			expect(result).toHaveProperty("name", "TestPolicy");
			expect(result).toHaveProperty("file", "test.ts");
		});

		it("should convert PolicyError with fixed=false to PolicyFixResult", () => {
			const error: PolicyError = {
				error: "Could not fix",
				fixed: false,
			};
			const result = convertToLegacyResult(error, "TestPolicy", "test.ts");

			expect(result).toHaveProperty("resolved", false);
		});

		it("should handle minimal PolicyError", () => {
			const error: PolicyError = { error: "Simple error" };
			const result = convertToLegacyResult(error, "MyPolicy", "file.ts");

			expect(result).toHaveProperty("name", "MyPolicy");
			expect(result).toHaveProperty("file", "file.ts");
			expect(result).toHaveProperty("errorMessages", ["Simple error"]);
			expect(result).toHaveProperty("autoFixable", undefined);
			expect(result).not.toHaveProperty("resolved");
		});
	});
});
