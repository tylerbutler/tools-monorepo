import type { Logger } from "@tylerbu/cli-api";
import { ScriptAnalyzer } from "../analysis/ScriptAnalyzer.js";
import { ConfigurationMerger } from "../config/ConfigurationMerger.js";
import { ConfigurationParser } from "../config/ConfigurationParser.js";
import { DependencyResolver } from "../dependencies/DependencyResolver.js";
import { BuildExecutor } from "../execution/BuildExecutor.js";
import type {
	IBuildExecutionContext,
	IBuildExecutor,
	IConfigurationMerger,
	IConfigurationParser,
	IDependencyResolver,
	IScriptAnalyzer,
} from "../interfaces/index.js";
import type { IServiceContainer } from "./ServiceContainer.js";
import { SERVICE_IDENTIFIERS, ServiceLifetime } from "./ServiceContainer.js";

/**
 * Registers all core services with the dependency injection container
 */
export function registerCoreServices(
	container: IServiceContainer,
): IServiceContainer {
	// Register configuration services as singletons
	container.registerSingleton<IConfigurationParser>(
		SERVICE_IDENTIFIERS.ConfigurationParser,
		() => new ConfigurationParser(),
	);

	container.registerSingleton<IConfigurationMerger>(
		SERVICE_IDENTIFIERS.ConfigurationMerger,
		() => new ConfigurationMerger(),
	);

	container.registerSingleton<IScriptAnalyzer>(
		SERVICE_IDENTIFIERS.ScriptAnalyzer,
		() => new ScriptAnalyzer(),
	);

	// Register dependency resolver as singleton
	container.registerSingleton<IDependencyResolver>(
		SERVICE_IDENTIFIERS.DependencyResolver,
		() => new DependencyResolver(),
	);

	// Register build executor as singleton (but it will need context-specific data)
	// Note: BuildExecutor typically needs logger and context, so it might be better as transient
	// We'll register a factory method instead
	container.register<IBuildExecutor>(
		SERVICE_IDENTIFIERS.BuildExecutor,
		(_serviceContainer) => {
			// BuildExecutor requires logger and context which are context-specific
			// This factory will be used by the consumers who have the context
			throw new Error(
				"BuildExecutor must be created with context-specific parameters. Use createBuildExecutor() instead.",
			);
		},
		ServiceLifetime.Transient,
	);

	return container;
}

/**
 * Creates a configured service container with all core services registered
 */
export async function createServiceContainer(): Promise<IServiceContainer> {
	const { ServiceContainer } = await import("./ServiceContainer.js");
	const container = new ServiceContainer();
	return registerCoreServices(container);
}

/**
 * Creates a BuildExecutor with the provided logger and context
 */
export function createBuildExecutor(
	logger: unknown, // Logger type
	context: unknown, // BuildExecutionContext type
): IBuildExecutor {
	return new BuildExecutor(logger as Logger, context as IBuildExecutionContext);
}
