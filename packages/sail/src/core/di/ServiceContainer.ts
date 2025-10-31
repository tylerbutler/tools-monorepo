/**
 * Service lifecycle types for dependency injection
 */
export const ServiceLifetime = {
	/** New instance created every time the service is requested */
	Transient: "transient",
	/** Single instance shared across all requests */
	Singleton: "singleton",
} as const;

/**
 * Service lifetime type
 */
export type ServiceLifetime = (typeof ServiceLifetime)[keyof typeof ServiceLifetime];

/**
 * Service factory function type
 */
export type ServiceFactory<T> = (container: IServiceContainer) => T;

/**
 * Service registration descriptor
 */
export interface ServiceDescriptor<T = unknown> {
	readonly factory: ServiceFactory<T>;
	readonly lifetime: ServiceLifetime;
	instance?: T;
}

/**
 * Service identifier type - can be string, symbol, or constructor function
 */
export type ServiceIdentifier<T = unknown> =
	| string
	| symbol
	| (new (
			...args: unknown[]
	  ) => T);

/**
 * Service container interface for dependency injection
 */
export interface IServiceContainer {
	/**
	 * Registers a service with the container
	 */
	register<T>(
		identifier: ServiceIdentifier<T>,
		factory: ServiceFactory<T>,
		lifetime?: ServiceLifetime,
	): IServiceContainer;

	/**
	 * Registers a singleton service
	 */
	registerSingleton<T>(
		identifier: ServiceIdentifier<T>,
		factory: ServiceFactory<T>,
	): IServiceContainer;

	/**
	 * Registers a transient service
	 */
	registerTransient<T>(
		identifier: ServiceIdentifier<T>,
		factory: ServiceFactory<T>,
	): IServiceContainer;

	/**
	 * Resolves a service from the container
	 */
	resolve<T>(identifier: ServiceIdentifier<T>): T;

	/**
	 * Checks if a service is registered
	 */
	isRegistered<T>(identifier: ServiceIdentifier<T>): boolean;

	/**
	 * Creates a child container that inherits from this container
	 */
	createScope(): IServiceContainer;
}

/**
 * Simple dependency injection container implementation
 */
export class ServiceContainer implements IServiceContainer {
	private readonly services = new Map<ServiceIdentifier, ServiceDescriptor>();
	private readonly parent?: IServiceContainer;

	public constructor(parent?: IServiceContainer) {
		this.parent = parent;
	}

	public register<T>(
		identifier: ServiceIdentifier<T>,
		factory: ServiceFactory<T>,
		lifetime: ServiceLifetime = ServiceLifetime.Transient,
	): IServiceContainer {
		this.services.set(identifier, {
			factory,
			lifetime,
		});
		return this;
	}

	public registerSingleton<T>(
		identifier: ServiceIdentifier<T>,
		factory: ServiceFactory<T>,
	): IServiceContainer {
		return this.register(identifier, factory, ServiceLifetime.Singleton);
	}

	public registerTransient<T>(
		identifier: ServiceIdentifier<T>,
		factory: ServiceFactory<T>,
	): IServiceContainer {
		return this.register(identifier, factory, ServiceLifetime.Transient);
	}

	public resolve<T>(identifier: ServiceIdentifier<T>): T {
		const descriptor = this.getServiceDescriptor<T>(identifier);

		if (descriptor.lifetime === ServiceLifetime.Singleton) {
			if (!descriptor.instance) {
				descriptor.instance = descriptor.factory(this);
			}
			return descriptor.instance as T;
		}

		// Transient
		return descriptor.factory(this);
	}

	public isRegistered<T>(identifier: ServiceIdentifier<T>): boolean {
		return (
			this.services.has(identifier) ||
			(this.parent?.isRegistered(identifier) ?? false)
		);
	}

	public createScope(): IServiceContainer {
		return new ServiceContainer(this);
	}

	private getServiceDescriptor<T>(
		identifier: ServiceIdentifier<T>,
	): ServiceDescriptor<T> {
		const descriptor = this.services.get(identifier);

		if (descriptor) {
			return descriptor as ServiceDescriptor<T>;
		}

		if (this.parent?.isRegistered(identifier)) {
			// Delegate to parent but return as our descriptor type
			const parentInstance = this.parent.resolve<T>(identifier);
			return {
				factory: () => parentInstance,
				lifetime: ServiceLifetime.Singleton,
				instance: parentInstance,
			};
		}

		throw new Error(`Service '${String(identifier)}' is not registered.`);
	}
}

/**
 * Service identifiers for core services
 */
export const SERVICE_IDENTIFIERS = {
	ConfigurationParser: Symbol("ConfigurationParser"),
	ConfigurationMerger: Symbol("ConfigurationMerger"),
	ScriptAnalyzer: Symbol("ScriptAnalyzer"),
	DependencyResolver: Symbol("DependencyResolver"),
	BuildExecutor: Symbol("BuildExecutor"),
	TaskManager: Symbol("TaskManager"),
} as const;
