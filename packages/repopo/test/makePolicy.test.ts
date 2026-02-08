import { beforeEach, describe, expect, it } from "vitest";
import {
	makePolicy,
	makePolicyDefinition,
	policy,
} from "../src/makePolicy.js";
import type {
	PolicyDefinition,
	PolicyFixResult,
	PolicyHandler,
	PolicyInstanceSettings,
	PolicyShape,
	PolicyStandaloneResolver,
} from "../src/policy.js";

describe("makePolicyDefinition", () => {
	it("should create a valid PolicyDefinition with required parameters", () => {
		const handler: PolicyHandler = async () => true as const;

		const definition = makePolicyDefinition({
			name: "TestPolicy",
			description: "A test policy for testing purposes.",
			match: /\.test\.ts$/,
			handler,
		});

		expect(definition).toEqual({
			name: "TestPolicy",
			description: "A test policy for testing purposes.",
			match: /\.test\.ts$/,
			handler,
			defaultConfig: undefined,
			resolver: undefined,
		});
	});

	it("should create PolicyDefinition with all optional parameters", () => {
		const handler: PolicyHandler<{ threshold: number }> = async ({
			config,
			file,
		}) => {
			if (config !== undefined && config.threshold > 0) {
				return true;
			}
			return {
				name: "TestPolicy",
				file,
				errorMessages: ["Config threshold must be positive"],
				autoFixable: false,
			};
		};

		const resolver: PolicyStandaloneResolver<{ threshold: number }> = async ({
			file,
		}) => ({
			name: "TestPolicy",
			file,
			resolved: true,
			errorMessages: ["Fixed"],
		});

		const definition = makePolicyDefinition({
			name: "TestPolicy",
			description: "Test policy with config",
			match: /\.ts$/,
			handler,
			defaultConfig: { threshold: 100 },
			resolver,
		});

		expect(definition.name).toBe("TestPolicy");
		expect(definition.match).toEqual(/\.ts$/);
		expect(definition.handler).toBe(handler);
		expect(definition.defaultConfig).toEqual({ threshold: 100 });
		expect(definition.description).toBe("Test policy with config");
		expect(definition.resolver).toBe(resolver);
	});

	it("should create PolicyDefinition with description but no config", () => {
		const handler: PolicyHandler = async () => true as const;

		const definition = makePolicyDefinition({
			name: "DescriptivePolicy",
			description: "A policy with description",
			match: /\.md$/,
			handler,
		});

		expect(definition.name).toBe("DescriptivePolicy");
		expect(definition.description).toBe("A policy with description");
		expect(definition.defaultConfig).toBeUndefined();
		expect(definition.resolver).toBeUndefined();
	});

	it("should create PolicyDefinition with config", () => {
		interface TestConfig {
			maxSize: number;
		}

		const handler: PolicyHandler<TestConfig> = async ({ config, file }) => {
			if (config !== undefined && config.maxSize < 1000) {
				return true;
			}
			return {
				name: "ConfigPolicy",
				file,
				errorMessages: ["Max size must be less than 1000"],
				autoFixable: false,
			};
		};

		const definition = makePolicyDefinition({
			name: "ConfigPolicy",
			description: "Policy with configuration",
			match: /\.json$/,
			handler,
			defaultConfig: { maxSize: 500 },
		});

		expect(definition.name).toBe("ConfigPolicy");
		expect(definition.defaultConfig).toEqual({ maxSize: 500 });
		expect(definition.description).toBe("Policy with configuration");
	});

	it("should create PolicyDefinition with resolver but no config", () => {
		const handler: PolicyHandler = async ({ file }) => ({
			name: "ResolverPolicy",
			file,
			errorMessages: ["Needs fix"],
			autoFixable: true,
		});

		const resolver: PolicyStandaloneResolver = async ({ file }) => ({
			name: "ResolverPolicy",
			file,
			resolved: true,
			errorMessages: ["Fixed"],
		});

		const definition = makePolicyDefinition({
			name: "ResolverPolicy",
			description: "Policy with resolver",
			match: /\.txt$/,
			handler,
			defaultConfig: undefined,
			resolver,
		});

		expect(definition.resolver).toBe(resolver);
		expect(definition.defaultConfig).toBeUndefined();
		expect(definition.description).toBe("Policy with resolver");
	});

	it("should work with Effection generator handlers", () => {
		const handler: PolicyHandler = function* () {
			yield* (function* () {
				// Minimal yield to satisfy generator requirements
			})();
			return true as const;
		};

		const definition = makePolicyDefinition({
			name: "GeneratorPolicy",
			description: "Policy using Effection generators",
			match: /\.ts$/,
			handler,
		});

		expect(definition.handler).toBe(handler);
		expect(definition.name).toBe("GeneratorPolicy");
	});

	it("should work with Effection generator resolvers", () => {
		const handler: PolicyHandler = async () => true as const;

		const resolver: PolicyStandaloneResolver = function* ({ file }) {
			yield* (function* () {
				// Minimal yield to satisfy generator requirements
			})();
			const result: PolicyFixResult = {
				name: "GeneratorResolverPolicy",
				file,
				resolved: true,
				errorMessages: ["Fixed with generator"],
			};
			return result;
		};

		const definition = makePolicyDefinition({
			name: "GeneratorResolverPolicy",
			description: "Policy with generator resolver",
			match: /\.js$/,
			handler,
			defaultConfig: undefined,
			resolver,
		});

		expect(definition.resolver).toBe(resolver);
	});

	it("should preserve regex patterns correctly", () => {
		const handler: PolicyHandler = async () => true as const;
		const complexRegex = /^(src|test)\/.*\.(ts|tsx|js|jsx)$/;

		const definition = makePolicyDefinition({
			name: "ComplexMatchPolicy",
			description: "Policy with complex regex match",
			match: complexRegex,
			handler,
		});

		expect(definition.match).toBe(complexRegex);
		expect("src/index.ts").toMatch(definition.match);
		expect("test/unit.spec.ts").toMatch(definition.match);
		expect("lib/index.ts").not.toMatch(definition.match);
	});
});

describe("makePolicy", () => {
	let baseDefinition: PolicyDefinition<{ threshold: number }>;

	beforeEach(() => {
		const handler: PolicyHandler<{ threshold: number }> = async ({
			config,
			file,
		}) => {
			if (config !== undefined && config.threshold > 0) {
				return true;
			}
			return {
				name: "TestPolicy",
				file,
				errorMessages: ["Config threshold must be positive"],
				autoFixable: false,
			};
		};

		baseDefinition = {
			name: "TestPolicy",
			description: "A test policy",
			match: /\.ts$/,
			handler,
			defaultConfig: { threshold: 50 },
		};
	});

	it("should create PolicyInstance from definition only", () => {
		const instance = makePolicy(baseDefinition);

		expect(instance.name).toBe("TestPolicy");
		expect(instance.match).toEqual(/\.ts$/);
		expect(instance.handler).toBe(baseDefinition.handler);
		expect(instance.defaultConfig).toEqual({ threshold: 50 });
		expect(instance.description).toBe("A test policy");
		expect(instance.config).toBeUndefined();
	});

	it("should merge config into policy instance", () => {
		const instance = makePolicy(baseDefinition, { threshold: 100 });

		expect(instance.config).toEqual({ threshold: 100 });
		expect(instance.defaultConfig).toEqual({ threshold: 50 });
		expect(instance.name).toBe("TestPolicy");
	});

	it("should merge settings into policy instance", () => {
		const settings: PolicyInstanceSettings<{ threshold: number }> = {
			excludeFiles: [/test\.ts$/, /spec\.ts$/],
		};

		const instance = makePolicy(baseDefinition, undefined, settings);

		expect(instance.excludeFiles).toEqual([/test\.ts$/, /spec\.ts$/]);
		expect(instance.name).toBe("TestPolicy");
	});

	it("should merge both config and settings", () => {
		const settings: PolicyInstanceSettings<{ threshold: number }> = {
			excludeFiles: [/\.spec\.ts$/],
		};

		const instance = makePolicy(baseDefinition, { threshold: 200 }, settings);

		expect(instance.config).toEqual({ threshold: 200 });
		expect(instance.excludeFiles).toEqual([/\.spec\.ts$/]);
		expect(instance.defaultConfig).toEqual({ threshold: 50 });
	});

	it("should preserve all definition properties", () => {
		const resolver: PolicyStandaloneResolver<{ threshold: number }> = async ({
			file,
		}) => ({
			name: "TestPolicy",
			file,
			resolved: true,
			errorMessages: ["Fixed"],
		});

		const definitionWithResolver: PolicyDefinition<{ threshold: number }> = {
			...baseDefinition,
			resolver,
		};

		const instance = makePolicy(definitionWithResolver, { threshold: 75 });

		expect(instance.name).toBe("TestPolicy");
		expect(instance.match).toEqual(/\.ts$/);
		expect(instance.handler).toBe(baseDefinition.handler);
		expect(instance.resolver).toBe(resolver);
		expect(instance.config).toEqual({ threshold: 75 });
		expect(instance.defaultConfig).toEqual({ threshold: 50 });
		expect(instance.description).toBe("A test policy");
	});

	it("should handle undefined config gracefully", () => {
		const instance = makePolicy(baseDefinition, undefined);

		expect(instance.config).toBeUndefined();
		expect(instance.defaultConfig).toEqual({ threshold: 50 });
	});

	it("should handle undefined settings gracefully", () => {
		const instance = makePolicy(baseDefinition, { threshold: 80 }, undefined);

		expect(instance.config).toEqual({ threshold: 80 });
		expect(instance.excludeFiles).toBeUndefined();
	});

	it("should handle policy without defaultConfig", () => {
		const handler: PolicyHandler = async () => true as const;
		const simpleDefinition: PolicyDefinition = {
			name: "SimplePolicy",
			description: "A simple policy",
			match: /\.txt$/,
			handler,
		};

		const instance = makePolicy(simpleDefinition);

		expect(instance.name).toBe("SimplePolicy");
		expect(instance.config).toBeUndefined();
		expect(instance.defaultConfig).toBeUndefined();
	});

	it("should work with Effection-based definitions", () => {
		const generatorHandler: PolicyHandler = function* () {
			yield* (function* () {
				// Minimal yield to satisfy generator requirements
			})();
			return true as const;
		};

		const generatorDefinition: PolicyDefinition = {
			name: "GeneratorPolicy",
			description: "Policy using generators",
			match: /\.ts$/,
			handler: generatorHandler,
		};

		const instance = makePolicy(generatorDefinition);

		expect(instance.handler).toBe(generatorHandler);
		expect(instance.name).toBe("GeneratorPolicy");
	});

	it("should create multiple instances from same definition", () => {
		const instance1 = makePolicy(baseDefinition, { threshold: 100 });
		const instance2 = makePolicy(baseDefinition, { threshold: 200 });

		expect(instance1.config).toEqual({ threshold: 100 });
		expect(instance2.config).toEqual({ threshold: 200 });
		expect(instance1.handler).toBe(instance2.handler);
		expect(instance1.name).toBe(instance2.name);
	});

	it("should support complex excludeFiles patterns", () => {
		const settings: PolicyInstanceSettings<{ threshold: number }> = {
			excludeFiles: [/node_modules/, /\.git/, /dist/, /build/, /coverage/],
		};

		const instance = makePolicy(baseDefinition, undefined, settings);

		expect(instance.excludeFiles).toHaveLength(5);
		expect(instance.excludeFiles).toContainEqual(/node_modules/);
		expect(instance.excludeFiles).toContainEqual(/\.git/);
	});
});

describe("policy()", () => {
	const basePolicyDef: PolicyShape<{ threshold: number }> = {
		name: "TestPolicy",
		description: "A test policy",
		match: /\.ts$/,
		handler: async () => true as const,
		defaultConfig: { threshold: 50 },
	};

	const noConfigPolicyDef: PolicyShape = {
		name: "SimplePolicy",
		description: "A simple policy",
		match: /\.ts$/,
		handler: async () => true as const,
	};

	describe("one-argument form: policy(def)", () => {
		it("should create a ConfiguredPolicy with defaults", () => {
			const result = policy(noConfigPolicyDef);

			expect(result.name).toBe("SimplePolicy");
			expect(result.match).toEqual(/\.ts$/);
			expect(result.handler).toBe(noConfigPolicyDef.handler);
			expect(result.config).toBeUndefined();
			expect(result.exclude).toBeUndefined();
			expect(result.excludeFiles).toBeUndefined();
		});

		it("should use defaultConfig when no config is provided", () => {
			const result = policy(basePolicyDef);

			expect(result.config).toEqual({ threshold: 50 });
		});

		it("should set _internalHandler", () => {
			const result = policy(noConfigPolicyDef);

			expect(result._internalHandler).toBeDefined();
			expect(typeof result._internalHandler).toBe("function");
		});
	});

	describe("two-argument form: policy(def, options)", () => {
		it("should accept options with exclude patterns", () => {
			const result = policy(noConfigPolicyDef, {
				exclude: [/node_modules/],
			});

			expect(result.exclude).toEqual([/node_modules/]);
			expect(result.excludeFiles).toEqual([/node_modules/]);
			expect(result.config).toBeUndefined();
		});

		it("should detect options vs config correctly when object has only exclude", () => {
			const result = policy(noConfigPolicyDef, {
				exclude: ["vendor/*"],
			});

			expect(result.exclude).toEqual(["vendor/*"]);
			expect(result.config).toBeUndefined();
		});
	});

	describe("two-argument form: policy(def, config)", () => {
		it("should accept config object", () => {
			const result = policy(basePolicyDef, { threshold: 100 });

			expect(result.config).toEqual({ threshold: 100 });
			expect(result.exclude).toBeUndefined();
		});

		it("should override defaultConfig with provided config", () => {
			const result = policy(basePolicyDef, { threshold: 200 });

			expect(result.config).toEqual({ threshold: 200 });
			expect(result.defaultConfig).toEqual({ threshold: 50 });
		});
	});

	describe("three-argument form: policy(def, config, options)", () => {
		it("should accept both config and options", () => {
			const result = policy(basePolicyDef, { threshold: 100 }, {
				exclude: [/node_modules/],
			});

			expect(result.config).toEqual({ threshold: 100 });
			expect(result.exclude).toEqual([/node_modules/]);
			expect(result.excludeFiles).toEqual([/node_modules/]);
		});
	});

	describe("handler normalization", () => {
		it("should normalize async handlers to _internalHandler", () => {
			const asyncHandler: PolicyHandler = async () => true as const;
			const def: PolicyShape = {
				name: "AsyncPolicy",
				description: "Async policy",
				match: /\.ts$/,
				handler: asyncHandler,
			};

			const result = policy(def);
			expect(result._internalHandler).toBeDefined();
		});

		it("should normalize generator handlers to _internalHandler", () => {
			const genHandler: PolicyHandler = function* () {
				return true as const;
			};
			const def: PolicyShape = {
				name: "GenPolicy",
				description: "Generator policy",
				match: /\.ts$/,
				handler: genHandler,
			};

			const result = policy(def);
			expect(result._internalHandler).toBeDefined();
		});
	});

	describe("preserves policy definition properties", () => {
		it("should spread all properties from the policy definition", () => {
			const resolver: PolicyStandaloneResolver<{
				threshold: number;
			}> = async ({ file }) => ({
				name: "TestPolicy",
				file,
				resolved: true,
				errorMessages: ["Fixed"],
			});

			const defWithResolver: PolicyShape<{ threshold: number }> = {
				...basePolicyDef,
				resolver,
			};

			const result = policy(defWithResolver, { threshold: 75 });

			expect(result.name).toBe("TestPolicy");
			expect(result.description).toBe("A test policy");
			expect(result.match).toEqual(/\.ts$/);
			expect(result.resolver).toBe(resolver);
			expect(result.config).toEqual({ threshold: 75 });
		});
	});
});
