import { describe, expect, it } from "vitest";
import { makePolicy, makePolicyDefinition } from "../src/makePolicy.js";
import type {
	PolicyDefinition,
	PolicyFailure,
	PolicyFixResult,
	PolicyHandler,
	PolicyInstance,
	PolicyInstanceSettings,
	PolicyStandaloneResolver,
} from "../src/policy.js";

describe("makePolicyDefinition", () => {
	it("should create a valid PolicyDefinition with required parameters", () => {
		const handler: PolicyHandler = async ({ file }) => true;

		const definition = makePolicyDefinition(
			"TestPolicy",
			/\.test\.ts$/,
			handler,
		);

		expect(definition).toEqual({
			name: "TestPolicy",
			match: /\.test\.ts$/,
			handler,
			description: undefined,
			defaultConfig: undefined,
			resolver: undefined,
		});
	});

	it("should create PolicyDefinition with all optional parameters", () => {
		const handler: PolicyHandler<{ threshold: number }> = async ({
			config,
		}) => {
			return config!.threshold > 0;
		};

		const resolver: PolicyStandaloneResolver<{ threshold: number }> = async ({
			file,
		}) => ({
			name: "TestPolicy",
			file,
			resolved: true,
			errorMessage: "Fixed",
		});

		const definition = makePolicyDefinition(
			"TestPolicy",
			/\.ts$/,
			handler,
			{ threshold: 100 },
			"Test policy with config",
			resolver,
		);

		expect(definition.name).toBe("TestPolicy");
		expect(definition.match).toEqual(/\.ts$/);
		expect(definition.handler).toBe(handler);
		expect(definition.defaultConfig).toEqual({ threshold: 100 });
		expect(definition.description).toBe("Test policy with config");
		expect(definition.resolver).toBe(resolver);
	});

	it("should create PolicyDefinition with description but no config", () => {
		const handler: PolicyHandler = async () => true;

		const definition = makePolicyDefinition(
			"DescriptivePolicy",
			/\.md$/,
			handler,
			undefined,
			"A policy with description",
		);

		expect(definition.name).toBe("DescriptivePolicy");
		expect(definition.description).toBe("A policy with description");
		expect(definition.defaultConfig).toBeUndefined();
		expect(definition.resolver).toBeUndefined();
	});

	it("should create PolicyDefinition with config but no description", () => {
		interface TestConfig {
			maxSize: number;
		}

		const handler: PolicyHandler<TestConfig> = async ({ config }) => {
			return config!.maxSize < 1000;
		};

		const definition = makePolicyDefinition(
			"ConfigPolicy",
			/\.json$/,
			handler,
			{ maxSize: 500 },
		);

		expect(definition.name).toBe("ConfigPolicy");
		expect(definition.defaultConfig).toEqual({ maxSize: 500 });
		expect(definition.description).toBeUndefined();
	});

	it("should create PolicyDefinition with resolver but no config", () => {
		const handler: PolicyHandler = async ({ file }) => ({
			name: "ResolverPolicy",
			file,
			errorMessage: "Needs fix",
			autoFixable: true,
		});

		const resolver: PolicyStandaloneResolver = async ({ file }) => ({
			name: "ResolverPolicy",
			file,
			resolved: true,
			errorMessage: "Fixed",
		});

		const definition = makePolicyDefinition(
			"ResolverPolicy",
			/\.txt$/,
			handler,
			undefined,
			undefined,
			resolver,
		);

		expect(definition.resolver).toBe(resolver);
		expect(definition.defaultConfig).toBeUndefined();
		expect(definition.description).toBeUndefined();
	});

	it("should work with Effection generator handlers", () => {
		const handler: PolicyHandler = function* ({ file }) {
			return true;
		};

		const definition = makePolicyDefinition(
			"GeneratorPolicy",
			/\.ts$/,
			handler,
		);

		expect(definition.handler).toBe(handler);
		expect(definition.name).toBe("GeneratorPolicy");
	});

	it("should work with Effection generator resolvers", () => {
		const handler: PolicyHandler = async () => true;

		const resolver: PolicyStandaloneResolver = function* ({ file }) {
			const result: PolicyFixResult = {
				name: "GeneratorResolverPolicy",
				file,
				resolved: true,
				errorMessage: "Fixed with generator",
			};
			return result;
		};

		const definition = makePolicyDefinition(
			"GeneratorResolverPolicy",
			/\.js$/,
			handler,
			undefined,
			undefined,
			resolver,
		);

		expect(definition.resolver).toBe(resolver);
	});

	it("should preserve regex patterns correctly", () => {
		const handler: PolicyHandler = async () => true;
		const complexRegex = /^(src|test)\/.*\.(ts|tsx|js|jsx)$/;

		const definition = makePolicyDefinition(
			"ComplexMatchPolicy",
			complexRegex,
			handler,
		);

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
		}) => {
			return config!.threshold > 0;
		};

		baseDefinition = {
			name: "TestPolicy",
			match: /\.ts$/,
			handler,
			defaultConfig: { threshold: 50 },
			description: "A test policy",
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
		const settings: PolicyInstanceSettings = {
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
			errorMessage: "Fixed",
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
		const handler: PolicyHandler = async () => true;
		const simpleDefinition: PolicyDefinition = {
			name: "SimplePolicy",
			match: /\.txt$/,
			handler,
		};

		const instance = makePolicy(simpleDefinition);

		expect(instance.name).toBe("SimplePolicy");
		expect(instance.config).toBeUndefined();
		expect(instance.defaultConfig).toBeUndefined();
	});

	it("should override definition properties with settings", () => {
		const originalResolver: PolicyStandaloneResolver<{
			threshold: number;
		}> = async ({ file }) => ({
			name: "TestPolicy",
			file,
			resolved: true,
			errorMessage: "Original resolver",
		});

		const newResolver: PolicyStandaloneResolver<{
			threshold: number;
		}> = async ({ file }) => ({
			name: "TestPolicy",
			file,
			resolved: true,
			errorMessage: "New resolver",
		});

		const definitionWithResolver: PolicyDefinition<{ threshold: number }> = {
			...baseDefinition,
			resolver: originalResolver,
		};

		const settings: PolicyInstanceSettings<{ threshold: number }> = {
			resolver: newResolver,
		};

		const instance = makePolicy(definitionWithResolver, undefined, settings);

		expect(instance.resolver).toBe(newResolver);
		expect(instance.resolver).not.toBe(originalResolver);
	});

	it("should work with Effection-based definitions", () => {
		const generatorHandler: PolicyHandler = function* ({ file }) {
			return true;
		};

		const generatorDefinition: PolicyDefinition = {
			name: "GeneratorPolicy",
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
		const settings: PolicyInstanceSettings = {
			excludeFiles: [/node_modules/, /\.git/, /dist/, /build/, /coverage/],
		};

		const instance = makePolicy(baseDefinition, undefined, settings);

		expect(instance.excludeFiles).toHaveLength(5);
		expect(instance.excludeFiles).toContainEqual(/node_modules/);
		expect(instance.excludeFiles).toContainEqual(/\.git/);
	});
});
