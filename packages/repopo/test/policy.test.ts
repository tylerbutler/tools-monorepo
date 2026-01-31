import { describe, expect, it } from "vitest";
import {
	DefaultPolicies,
	isPolicyFixResult,
	Policy,
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

			const policy = new TestPolicy(
				"TestPolicy",
				/\.ts$/,
				handler,
				"A test policy for TypeScript files",
				{ setting: "default" },
				resolver,
			);

			expect(policy.name).toBe("TestPolicy");
			expect(policy.match).toEqual(/\.ts$/);
			expect(policy.handler).toBe(handler);
			expect(policy.description).toBe("A test policy for TypeScript files");
			expect(policy.defaultConfig).toEqual({ setting: "default" });
			expect(policy.resolver).toBe(resolver);
		});

		it("should be instantiable with minimal parameters", () => {
			const handler: PolicyHandler<
				undefined
			> = async (): Promise<PolicyHandlerResult> => true;

			class MinimalPolicy extends Policy<undefined> {}

			const policy = new MinimalPolicy(
				"MinimalPolicy",
				/package\.json$/,
				handler,
			);

			expect(policy.name).toBe("MinimalPolicy");
			expect(policy.match).toEqual(/package\.json$/);
			expect(policy.handler).toBe(handler);
			expect(policy.description).toBeUndefined();
			expect(policy.defaultConfig).toBeUndefined();
			expect(policy.resolver).toBeUndefined();
		});

		it("should match files correctly using the regex", () => {
			const handler: PolicyHandler<
				undefined
			> = async (): Promise<PolicyHandlerResult> => true;

			class MinimalPolicy extends Policy<undefined> {}

			const policy = new MinimalPolicy(
				"TypeScriptPolicy",
				/\.(ts|tsx)$/,
				handler,
			);

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

			const policy = new ConfigurablePolicy(
				"ConfigurablePolicy",
				/\.ts$/,
				handler,
				"A configurable policy",
				{ threshold: 10 },
			);

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

		it("should include PackageScripts policy", () => {
			const hasPolicy = DefaultPolicies.some(
				(p) => p.name === "PackageScripts",
			);
			expect(hasPolicy).toBe(true);
		});
	});
});
