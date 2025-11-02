import { describe, it, expect, beforeEach } from "vitest";
import { ServiceContainer, SERVICE_IDENTIFIERS } from "../../../../src/core/di/ServiceContainer.js";
import {
	registerCoreServices,
	createServiceContainer,
	createBuildExecutor,
} from "../../../../src/core/di/ServiceRegistration.js";
import type {
	IConfigurationParser,
	IConfigurationMerger,
	IScriptAnalyzer,
	IDependencyResolver,
	IBuildExecutor,
} from "../../../../src/core/interfaces/index.js";

describe("ServiceRegistration", () => {
	describe("registerCoreServices", () => {
		let container: ServiceContainer;

		beforeEach(() => {
			container = new ServiceContainer();
		});

		it("should register all core services", () => {
			registerCoreServices(container);

			expect(container.isRegistered(SERVICE_IDENTIFIERS.ConfigurationParser)).toBe(true);
			expect(container.isRegistered(SERVICE_IDENTIFIERS.ConfigurationMerger)).toBe(true);
			expect(container.isRegistered(SERVICE_IDENTIFIERS.ScriptAnalyzer)).toBe(true);
			expect(container.isRegistered(SERVICE_IDENTIFIERS.DependencyResolver)).toBe(true);
			expect(container.isRegistered(SERVICE_IDENTIFIERS.BuildExecutor)).toBe(true);
		});

		it("should return the same container", () => {
			const result = registerCoreServices(container);

			expect(result).toBe(container);
		});

		it("should register ConfigurationParser as singleton", () => {
			registerCoreServices(container);

			const parser1 = container.resolve<IConfigurationParser>(
				SERVICE_IDENTIFIERS.ConfigurationParser,
			);
			const parser2 = container.resolve<IConfigurationParser>(
				SERVICE_IDENTIFIERS.ConfigurationParser,
			);

			expect(parser1).toBe(parser2);
		});

		it("should register ConfigurationMerger as singleton", () => {
			registerCoreServices(container);

			const merger1 = container.resolve<IConfigurationMerger>(
				SERVICE_IDENTIFIERS.ConfigurationMerger,
			);
			const merger2 = container.resolve<IConfigurationMerger>(
				SERVICE_IDENTIFIERS.ConfigurationMerger,
			);

			expect(merger1).toBe(merger2);
		});

		it("should register ScriptAnalyzer as singleton", () => {
			registerCoreServices(container);

			const analyzer1 = container.resolve<IScriptAnalyzer>(
				SERVICE_IDENTIFIERS.ScriptAnalyzer,
			);
			const analyzer2 = container.resolve<IScriptAnalyzer>(
				SERVICE_IDENTIFIERS.ScriptAnalyzer,
			);

			expect(analyzer1).toBe(analyzer2);
		});

		it("should register DependencyResolver as singleton", () => {
			registerCoreServices(container);

			const resolver1 = container.resolve<IDependencyResolver>(
				SERVICE_IDENTIFIERS.DependencyResolver,
			);
			const resolver2 = container.resolve<IDependencyResolver>(
				SERVICE_IDENTIFIERS.DependencyResolver,
			);

			expect(resolver1).toBe(resolver2);
		});

		it("should throw error when attempting to resolve BuildExecutor directly", () => {
			registerCoreServices(container);

			expect(() => {
				container.resolve<IBuildExecutor>(SERVICE_IDENTIFIERS.BuildExecutor);
			}).toThrow("BuildExecutor must be created with context-specific parameters");
		});

		it("should create working service instances", () => {
			registerCoreServices(container);

			const parser = container.resolve<IConfigurationParser>(
				SERVICE_IDENTIFIERS.ConfigurationParser,
			);
			const merger = container.resolve<IConfigurationMerger>(
				SERVICE_IDENTIFIERS.ConfigurationMerger,
			);
			const analyzer = container.resolve<IScriptAnalyzer>(
				SERVICE_IDENTIFIERS.ScriptAnalyzer,
			);
			const resolver = container.resolve<IDependencyResolver>(
				SERVICE_IDENTIFIERS.DependencyResolver,
			);

			expect(parser).toBeDefined();
			expect(merger).toBeDefined();
			expect(analyzer).toBeDefined();
			expect(resolver).toBeDefined();
		});

		it("should support fluent API for chaining", () => {
			const result = registerCoreServices(container);

			// Should be able to continue using the container
			expect(result.isRegistered(SERVICE_IDENTIFIERS.ConfigurationParser)).toBe(
				true,
			);
		});
	});

	describe("createServiceContainer", () => {
		it("should create a new service container", async () => {
			const container = await createServiceContainer();

			expect(container).toBeDefined();
			expect(typeof container.resolve).toBe("function");
			expect(typeof container.register).toBe("function");
			expect(typeof container.isRegistered).toBe("function");
		});

		it("should create container with all core services registered", async () => {
			const container = await createServiceContainer();

			expect(container.isRegistered(SERVICE_IDENTIFIERS.ConfigurationParser)).toBe(true);
			expect(container.isRegistered(SERVICE_IDENTIFIERS.ConfigurationMerger)).toBe(true);
			expect(container.isRegistered(SERVICE_IDENTIFIERS.ScriptAnalyzer)).toBe(true);
			expect(container.isRegistered(SERVICE_IDENTIFIERS.DependencyResolver)).toBe(true);
			expect(container.isRegistered(SERVICE_IDENTIFIERS.BuildExecutor)).toBe(true);
		});

		it("should create container with resolvable services", async () => {
			const container = await createServiceContainer();

			const parser = container.resolve<IConfigurationParser>(
				SERVICE_IDENTIFIERS.ConfigurationParser,
			);

			expect(parser).toBeDefined();
		});

		it("should create independent containers on multiple calls", async () => {
			const container1 = await createServiceContainer();
			const container2 = await createServiceContainer();

			expect(container1).not.toBe(container2);

			const parser1 = container1.resolve<IConfigurationParser>(
				SERVICE_IDENTIFIERS.ConfigurationParser,
			);
			const parser2 = container2.resolve<IConfigurationParser>(
				SERVICE_IDENTIFIERS.ConfigurationParser,
			);

			// Different containers should have different singleton instances
			expect(parser1).not.toBe(parser2);
		});
	});

	describe("createBuildExecutor", () => {
		it("should create a BuildExecutor instance", () => {
			const mockLogger = {
				verbose: () => {},
				info: () => {},
				warning: () => {},
				error: () => {},
			};

			const mockContext = {
				packages: [],
				cwd: process.cwd(),
			};

			const executor = createBuildExecutor(mockLogger, mockContext);

			expect(executor).toBeDefined();
			// BuildExecutor is defined and can be created
		});

		it("should create a working BuildExecutor", () => {
			const mockLogger = {
				verbose: () => {},
				info: () => {},
				warning: () => {},
				error: () => {},
			};

			const mockContext = {
				packages: [],
				cwd: process.cwd(),
			};

			const executor = createBuildExecutor(mockLogger, mockContext);

			expect(executor).toBeDefined();
		});

		it("should accept logger parameter", () => {
			const mockLogger = {
				verbose: () => {},
				info: () => {},
				warning: () => {},
				error: () => {},
			};

			const mockContext = {
				packages: [],
				cwd: process.cwd(),
			};

			const executor = createBuildExecutor(mockLogger, mockContext);

			expect(executor).toBeDefined();
		});

		it("should accept context parameter", () => {
			const mockLogger = {
				verbose: () => {},
				info: () => {},
				warning: () => {},
				error: () => {},
			};

			const mockContext = {
				packages: [],
				cwd: process.cwd(),
			};

			const executor = createBuildExecutor(mockLogger, mockContext);

			expect(executor).toBeDefined();
		});
	});

	describe("Service Integration", () => {
		it("should allow services to be resolved and used together", async () => {
			const container = await createServiceContainer();

			const parser = container.resolve<IConfigurationParser>(
				SERVICE_IDENTIFIERS.ConfigurationParser,
			);
			const merger = container.resolve<IConfigurationMerger>(
				SERVICE_IDENTIFIERS.ConfigurationMerger,
			);

			expect(parser).toBeDefined();
			expect(merger).toBeDefined();
		});

		it("should maintain singleton behavior across resolutions", async () => {
			const container = await createServiceContainer();

			const parser1 = container.resolve<IConfigurationParser>(
				SERVICE_IDENTIFIERS.ConfigurationParser,
			);
			const merger1 = container.resolve<IConfigurationMerger>(
				SERVICE_IDENTIFIERS.ConfigurationMerger,
			);
			const parser2 = container.resolve<IConfigurationParser>(
				SERVICE_IDENTIFIERS.ConfigurationParser,
			);
			const merger2 = container.resolve<IConfigurationMerger>(
				SERVICE_IDENTIFIERS.ConfigurationMerger,
			);

			expect(parser1).toBe(parser2);
			expect(merger1).toBe(merger2);
		});
	});

	describe("Error Handling", () => {
		it("should throw clear error when BuildExecutor is resolved directly", async () => {
			const container = await createServiceContainer();

			expect(() => {
				container.resolve<IBuildExecutor>(SERVICE_IDENTIFIERS.BuildExecutor);
			}).toThrow(/BuildExecutor must be created with context-specific parameters/);
		});

		it("should include usage guidance in BuildExecutor error", async () => {
			const container = await createServiceContainer();

			expect(() => {
				container.resolve<IBuildExecutor>(SERVICE_IDENTIFIERS.BuildExecutor);
			}).toThrow(/createBuildExecutor/);
		});
	});

	describe("Service Identifiers", () => {
		it("should use correct service identifiers for all services", () => {
			const container = new ServiceContainer();
			registerCoreServices(container);

			// Verify all expected identifiers are registered
			const identifiers = [
				SERVICE_IDENTIFIERS.ConfigurationParser,
				SERVICE_IDENTIFIERS.ConfigurationMerger,
				SERVICE_IDENTIFIERS.ScriptAnalyzer,
				SERVICE_IDENTIFIERS.DependencyResolver,
				SERVICE_IDENTIFIERS.BuildExecutor,
			];

			for (const identifier of identifiers) {
				expect(container.isRegistered(identifier)).toBe(true);
			}
		});
	});
});
