import { beforeEach, describe, expect, it } from "vitest";
import {
	type IServiceContainer,
	ServiceContainer,
	type ServiceIdentifier,
	ServiceLifetime,
} from "../../../../src/core/di/ServiceContainer.js";

describe("ServiceContainer", () => {
	let container: IServiceContainer;

	beforeEach(() => {
		container = new ServiceContainer();
	});

	describe("Service Registration", () => {
		describe("register", () => {
			it("should register a service with default transient lifetime", () => {
				// Arrange
				const identifier = "test-service";
				const factory = () => ({ value: 42 });

				// Act
				container.register(identifier, factory);

				// Assert
				expect(container.isRegistered(identifier)).toBe(true);
			});

			it("should register a service with explicit singleton lifetime", () => {
				// Arrange
				const identifier = "singleton-service";
				const factory = () => ({ value: 42 });

				// Act
				container.register(identifier, factory, ServiceLifetime.Singleton);

				// Assert
				expect(container.isRegistered(identifier)).toBe(true);
			});

			it("should register a service with explicit transient lifetime", () => {
				// Arrange
				const identifier = "transient-service";
				const factory = () => ({ value: 42 });

				// Act
				container.register(identifier, factory, ServiceLifetime.Transient);

				// Assert
				expect(container.isRegistered(identifier)).toBe(true);
			});

			it("should return the container for fluent API", () => {
				// Arrange
				const identifier = "fluent-service";
				const factory = () => ({ value: 42 });

				// Act
				const result = container.register(identifier, factory);

				// Assert
				expect(result).toBe(container);
			});

			it("should allow overriding existing services", () => {
				// Arrange
				const identifier = "override-service";
				const factory1 = () => ({ value: 1 });
				const factory2 = () => ({ value: 2 });

				// Act
				container.register(identifier, factory1);
				container.register(identifier, factory2);

				// Assert
				const resolved = container.resolve(identifier);
				expect(resolved.value).toBe(2);
			});
		});

		describe("registerSingleton", () => {
			it("should register a singleton service", () => {
				// Arrange
				const identifier = "singleton";
				const factory = () => ({ value: 42 });

				// Act
				container.registerSingleton(identifier, factory);

				// Assert
				expect(container.isRegistered(identifier)).toBe(true);
			});

			it("should return the container for fluent API", () => {
				// Arrange
				const identifier = "fluent-singleton";
				const factory = () => ({ value: 42 });

				// Act
				const result = container.registerSingleton(identifier, factory);

				// Assert
				expect(result).toBe(container);
			});
		});

		describe("registerTransient", () => {
			it("should register a transient service", () => {
				// Arrange
				const identifier = "transient";
				const factory = () => ({ value: 42 });

				// Act
				container.registerTransient(identifier, factory);

				// Assert
				expect(container.isRegistered(identifier)).toBe(true);
			});

			it("should return the container for fluent API", () => {
				// Arrange
				const identifier = "fluent-transient";
				const factory = () => ({ value: 42 });

				// Act
				const result = container.registerTransient(identifier, factory);

				// Assert
				expect(result).toBe(container);
			});
		});
	});

	describe("Service Resolution", () => {
		describe("resolve - Singleton", () => {
			it("should create singleton instance on first resolve", () => {
				// Arrange
				const identifier = "singleton";
				let callCount = 0;
				const factory = () => {
					callCount++;
					return { value: callCount };
				};
				container.registerSingleton(identifier, factory);

				// Act
				const instance = container.resolve(identifier);

				// Assert
				expect(instance.value).toBe(1);
				expect(callCount).toBe(1);
			});

			it("should return same singleton instance on subsequent resolves", () => {
				// Arrange
				const identifier = "singleton";
				let callCount = 0;
				const factory = () => {
					callCount++;
					return { value: callCount, id: Math.random() };
				};
				container.registerSingleton(identifier, factory);

				// Act
				const instance1 = container.resolve(identifier);
				const instance2 = container.resolve(identifier);
				const instance3 = container.resolve(identifier);

				// Assert
				expect(instance1).toBe(instance2);
				expect(instance2).toBe(instance3);
				expect(callCount).toBe(1); // Factory called only once
			});

			it("should pass the container to factory function", () => {
				// Arrange
				const identifier = "service-with-deps";
				let receivedContainer: IServiceContainer | undefined;
				const factory = (c: IServiceContainer) => {
					receivedContainer = c;
					return { value: 42 };
				};
				container.registerSingleton(identifier, factory);

				// Act
				container.resolve(identifier);

				// Assert
				expect(receivedContainer).toBe(container);
			});
		});

		describe("resolve - Transient", () => {
			it("should create new instance on each resolve", () => {
				// Arrange
				const identifier = "transient";
				let callCount = 0;
				const factory = () => {
					callCount++;
					return { value: callCount, id: Math.random() };
				};
				container.registerTransient(identifier, factory);

				// Act
				const instance1 = container.resolve(identifier);
				const instance2 = container.resolve(identifier);
				const instance3 = container.resolve(identifier);

				// Assert
				expect(instance1).not.toBe(instance2);
				expect(instance2).not.toBe(instance3);
				expect(instance1.value).toBe(1);
				expect(instance2.value).toBe(2);
				expect(instance3.value).toBe(3);
				expect(callCount).toBe(3); // Factory called three times
			});

			it("should pass the container to factory function", () => {
				// Arrange
				const identifier = "transient-with-deps";
				const receivedContainers: IServiceContainer[] = [];
				const factory = (c: IServiceContainer) => {
					receivedContainers.push(c);
					return { value: 42 };
				};
				container.registerTransient(identifier, factory);

				// Act
				container.resolve(identifier);
				container.resolve(identifier);

				// Assert
				expect(receivedContainers).toHaveLength(2);
				expect(receivedContainers[0]).toBe(container);
				expect(receivedContainers[1]).toBe(container);
			});
		});

		describe("resolve - Errors", () => {
			it("should throw error when resolving unregistered service", () => {
				// Arrange
				const identifier = "unregistered";

				// Act & Assert
				expect(() => container.resolve(identifier)).toThrow(
					"Service 'unregistered' is not registered",
				);
			});

			it("should include service identifier in error message", () => {
				// Arrange
				const identifier = "my-special-service";

				// Act & Assert
				expect(() => container.resolve(identifier)).toThrow(
					"Service 'my-special-service' is not registered",
				);
			});
		});

		describe("resolve - Dependency Injection", () => {
			it("should allow services to resolve other services", () => {
				// Arrange
				interface Config {
					apiUrl: string;
				}
				interface ApiClient {
					config: Config;
				}

				const configId: ServiceIdentifier<Config> = "config";
				const apiClientId: ServiceIdentifier<ApiClient> = "api-client";

				container.registerSingleton(configId, () => ({
					apiUrl: "https://api.example.com",
				}));

				container.registerSingleton(
					apiClientId,
					(c) =>
						({
							config: c.resolve(configId),
						}) as ApiClient,
				);

				// Act
				const apiClient = container.resolve(apiClientId);

				// Assert
				expect(apiClient.config.apiUrl).toBe("https://api.example.com");
			});

			it("should support complex dependency graphs", () => {
				// Arrange
				const dbId = "database";
				const repoId = "repository";
				const serviceId = "service";

				container.registerSingleton(dbId, () => ({ type: "postgres" }));
				container.registerSingleton(repoId, (c) => ({
					db: c.resolve(dbId),
				}));
				container.registerSingleton(serviceId, (c) => ({
					repo: c.resolve(repoId),
				}));

				// Act
				const service = container.resolve<{
					repo: { db: { type: string } };
				}>(serviceId);

				// Assert
				expect(service.repo.db.type).toBe("postgres");
			});
		});
	});

	describe("Service Registration Check", () => {
		describe("isRegistered", () => {
			it("should return true for registered services", () => {
				// Arrange
				const identifier = "registered-service";
				container.register(identifier, () => ({ value: 42 }));

				// Act & Assert
				expect(container.isRegistered(identifier)).toBe(true);
			});

			it("should return false for unregistered services", () => {
				// Arrange
				const identifier = "unregistered-service";

				// Act & Assert
				expect(container.isRegistered(identifier)).toBe(false);
			});

			it("should return true for singleton services", () => {
				// Arrange
				const identifier = "singleton";
				container.registerSingleton(identifier, () => ({ value: 42 }));

				// Act & Assert
				expect(container.isRegistered(identifier)).toBe(true);
			});

			it("should return true for transient services", () => {
				// Arrange
				const identifier = "transient";
				container.registerTransient(identifier, () => ({ value: 42 }));

				// Act & Assert
				expect(container.isRegistered(identifier)).toBe(true);
			});
		});
	});

	describe("Hierarchical Container (Scoping)", () => {
		describe("createScope", () => {
			it("should create a child container", () => {
				// Act
				const child = container.createScope();

				// Assert
				expect(child).toBeDefined();
				expect(child).not.toBe(container);
			});

			it("should allow child to access parent services", () => {
				// Arrange
				const identifier = "parent-service";
				container.registerSingleton(identifier, () => ({ value: 42 }));
				const child = container.createScope();

				// Act
				const resolved = child.resolve(identifier);

				// Assert
				expect(resolved.value).toBe(42);
			});

			it("should return true for isRegistered on parent services", () => {
				// Arrange
				const identifier = "parent-service";
				container.registerSingleton(identifier, () => ({ value: 42 }));
				const child = container.createScope();

				// Act & Assert
				expect(child.isRegistered(identifier)).toBe(true);
			});

			it("should allow child to override parent services", () => {
				// Arrange
				const identifier = "overridden-service";
				container.registerSingleton(identifier, () => ({ value: "parent" }));
				const child = container.createScope();
				child.registerSingleton(identifier, () => ({ value: "child" }));

				// Act
				const parentResolved = container.resolve<{ value: string }>(identifier);
				const childResolved = child.resolve<{ value: string }>(identifier);

				// Assert
				expect(parentResolved.value).toBe("parent");
				expect(childResolved.value).toBe("child");
			});

			it("should not allow parent to access child services", () => {
				// Arrange
				const identifier = "child-service";
				const child = container.createScope();
				child.registerSingleton(identifier, () => ({ value: 42 }));

				// Act & Assert
				expect(container.isRegistered(identifier)).toBe(false);
				expect(() => container.resolve(identifier)).toThrow();
			});

			it("should share parent singleton instances across multiple children", () => {
				// Arrange
				const identifier = "shared-singleton";
				let callCount = 0;
				container.registerSingleton(identifier, () => {
					callCount++;
					return { value: callCount, id: Math.random() };
				});

				const child1 = container.createScope();
				const child2 = container.createScope();

				// Act
				const instance1 = child1.resolve(identifier);
				const instance2 = child2.resolve(identifier);
				const parentInstance = container.resolve(identifier);

				// Assert
				expect(instance1).toBe(instance2);
				expect(instance1).toBe(parentInstance);
				expect(callCount).toBe(1); // Singleton created only once
			});

			it("should support nested scopes", () => {
				// Arrange
				const identifier = "nested-service";
				container.registerSingleton(identifier, () => ({ level: "root" }));

				const child = container.createScope();
				child.registerSingleton(identifier, () => ({ level: "child" }));

				const grandchild = child.createScope();
				grandchild.registerSingleton(identifier, () => ({
					level: "grandchild",
				}));

				// Act
				const rootResolved = container.resolve<{ level: string }>(identifier);
				const childResolved = child.resolve<{ level: string }>(identifier);
				const grandchildResolved = grandchild.resolve<{ level: string }>(
					identifier,
				);

				// Assert
				expect(rootResolved.level).toBe("root");
				expect(childResolved.level).toBe("child");
				expect(grandchildResolved.level).toBe("grandchild");
			});

			it("should allow grandchild to access root services when not overridden", () => {
				// Arrange
				const identifier = "root-service";
				container.registerSingleton(identifier, () => ({ value: "root" }));

				const child = container.createScope();
				const grandchild = child.createScope();

				// Act
				const grandchildResolved = grandchild.resolve<{ value: string }>(
					identifier,
				);

				// Assert
				expect(grandchildResolved.value).toBe("root");
			});
		});
	});

	describe("Service Identifier Types", () => {
		it("should support string identifiers", () => {
			// Arrange
			const identifier = "string-id";
			container.registerSingleton(identifier, () => ({ value: 42 }));

			// Act
			const resolved = container.resolve(identifier);

			// Assert
			expect(resolved.value).toBe(42);
		});

		it("should support symbol identifiers", () => {
			// Arrange
			const identifier = Symbol("symbol-id");
			container.registerSingleton(identifier, () => ({ value: 42 }));

			// Act
			const resolved = container.resolve(identifier);

			// Assert
			expect(resolved.value).toBe(42);
		});

		it("should support class constructor identifiers", () => {
			// Arrange
			class MyService {
				public value = 42;
			}
			container.registerSingleton(MyService, () => new MyService());

			// Act
			const resolved = container.resolve(MyService);

			// Assert
			expect(resolved).toBeInstanceOf(MyService);
			expect(resolved.value).toBe(42);
		});
	});

	describe("Edge Cases and Error Scenarios", () => {
		it("should handle factory functions that throw errors", () => {
			// Arrange
			const identifier = "error-factory";
			container.registerSingleton(identifier, () => {
				throw new Error("Factory failed");
			});

			// Act & Assert
			expect(() => container.resolve(identifier)).toThrow("Factory failed");
		});

		it("should handle factory functions that return undefined", () => {
			// Arrange
			const identifier = "undefined-factory";
			container.registerSingleton(identifier, () => undefined);

			// Act
			const resolved = container.resolve(identifier);

			// Assert
			expect(resolved).toBeUndefined();
		});

		it("should handle factory functions that return null", () => {
			// Arrange
			const identifier = "null-factory";
			container.registerSingleton(identifier, () => null);

			// Act
			const resolved = container.resolve(identifier);

			// Assert
			expect(resolved).toBeNull();
		});

		it("should preserve error stack traces from factory functions", () => {
			// Arrange
			const identifier = "stack-trace-factory";
			container.registerSingleton(identifier, () => {
				const error = new Error("Factory error");
				throw error;
			});

			// Act & Assert
			try {
				container.resolve(identifier);
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).stack).toBeDefined();
				expect((error as Error).stack).toContain("Factory error");
			}
		});
	});

	describe("Fluent API Chain", () => {
		it("should support fluent registration of multiple services", () => {
			// Act
			container
				.registerSingleton("service1", () => ({ value: 1 }))
				.registerSingleton("service2", () => ({ value: 2 }))
				.registerTransient("service3", () => ({ value: 3 }))
				.register("service4", () => ({ value: 4 }));

			// Assert
			expect(container.isRegistered("service1")).toBe(true);
			expect(container.isRegistered("service2")).toBe(true);
			expect(container.isRegistered("service3")).toBe(true);
			expect(container.isRegistered("service4")).toBe(true);
		});
	});
});
