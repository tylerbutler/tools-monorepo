import type { TaskHandlerPlugin, TaskHandlerPluginConfig } from "../sailConfig.js";
import type { TaskHandler } from "./taskHandlers.js";

/**
 * Interface that task handler plugins must implement.
 *
 * @remarks
 * Plugins declare which executables they support and provide the handlers for them.
 * This eliminates the need for users to manually map executables to handlers.
 *
 * @example
 * ```typescript
 * // vite-plugin.ts
 * import { SailPlugin, LeafTask } from '@tylerbu/sail';
 *
 * class ViteTask extends LeafTask {
 *   // Handler implementation
 * }
 *
 * export default {
 *   handlers: {
 *     'vite': ViteTask,
 *     'vite build': ViteTask,
 *     'vite dev': ViteTask,
 *   }
 * } satisfies SailPlugin;
 * ```
 */
export interface SailPlugin {
	/**
	 * Map of executable names to their task handlers.
	 */
	handlers: Record<string, TaskHandler>;

	/**
	 * Optional plugin name for debugging/logging
	 */
	name?: string;
}

/**
 * Registry for task handlers that maps executable names to TaskHandler implementations.
 *
 * This registry supports three types of handler registration:
 * 1. Direct registration of TaskHandler instances (programmatic)
 * 2. Config-based registration via module paths
 * 3. Built-in handlers (registered internally by Sail)
 *
 * @remarks
 * Handler resolution follows this priority order:
 * 1. Handlers registered programmatically via `register()`
 * 2. Handlers loaded from config via `loadFromConfig()`
 * 3. Built-in handlers (registered by Sail internally)
 *
 * @example
 * ```typescript
 * // Programmatic registration
 * const registry = new TaskHandlerRegistry();
 * registry.register('vite', ViteTask);
 *
 * // Config-based registration
 * await registry.loadHandler('vite', {
 *   modulePath: './handlers/ViteTask.js'
 * });
 * ```
 */
export class TaskHandlerRegistry {
	private readonly handlers = new Map<string, TaskHandler>();
	private readonly loadedModules = new Map<string, unknown>();

	/**
	 * Register a task handler for a specific executable.
	 *
	 * @param executable - The executable name or command to handle (e.g., 'tsc', 'vite build')
	 * @param handler - The TaskHandler implementation (constructor or factory function)
	 *
	 * @example
	 * ```typescript
	 * registry.register('vite', ViteTask);
	 * registry.register('vite build', createViteBuildHandler);
	 * ```
	 */
	public register(executable: string, handler: TaskHandler): void {
		this.handlers.set(executable.toLowerCase(), handler);
	}

	/**
	 * Get a registered task handler for an executable.
	 *
	 * @param executable - The executable name to look up
	 * @returns The TaskHandler if found, undefined otherwise
	 */
	public get(executable: string): TaskHandler | undefined {
		return this.handlers.get(executable.toLowerCase());
	}

	/**
	 * Check if a handler is registered for an executable.
	 *
	 * @param executable - The executable name to check
	 * @returns True if a handler is registered, false otherwise
	 */
	public has(executable: string): boolean {
		return this.handlers.has(executable.toLowerCase());
	}


	/**
	 * Load a plugin and register all its handlers.
	 *
	 * @param plugin - Plugin configuration (string or object)
	 * @param baseDir - Base directory for resolving relative module paths
	 * @throws Error if the plugin cannot be loaded or doesn't implement SailPlugin interface
	 *
	 * @example
	 * ```typescript
	 * // Load from package
	 * await registry.loadPlugin('@company/sail-vite-plugin');
	 *
	 * // Load from local file
	 * await registry.loadPlugin({ module: './plugins/vite.js' });
	 *
	 * // Load named export
	 * await registry.loadPlugin({
	 *   module: './plugins.js',
	 *   exportName: 'vitePlugin'
	 * });
	 * ```
	 */
	public async loadPlugin(plugin: TaskHandlerPlugin, baseDir?: string): Promise<void> {
		// Normalize plugin config
		const config: TaskHandlerPluginConfig =
			typeof plugin === "string" ? { module: plugin } : plugin;

		const { module: modulePath, exportName } = config;

		// Resolve the module path
		const resolvedPath = this.resolveModulePath(modulePath, baseDir);

		// Check if we've already loaded this module
		let module = this.loadedModules.get(resolvedPath);
		if (module === undefined) {
			try {
				module = await import(resolvedPath);
				this.loadedModules.set(resolvedPath, module);
			} catch (error) {
				throw new Error(
					`Failed to load plugin from '${resolvedPath}': ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}
		}

		// Extract the plugin from the module
		let pluginInstance: unknown;
		if (exportName !== undefined) {
			// biome-ignore lint/suspicious/noExplicitAny: module type is unknown at runtime
			pluginInstance = (module as any)[exportName];
			if (pluginInstance === undefined) {
				throw new Error(
					`Module '${modulePath}' does not export '${exportName}'. Available exports: ${Object.keys(
						module as object,
					).join(", ")}`,
				);
			}
		} else {
			// biome-ignore lint/suspicious/noExplicitAny: module type is unknown at runtime
			pluginInstance = (module as any).default ?? module;
		}

		// Validate that it's a SailPlugin
		if (!this.isSailPlugin(pluginInstance)) {
			throw new Error(
				`Plugin from '${modulePath}' ${exportName ? `(export '${exportName}')` : "(default export)"} must be a SailPlugin object with a 'handlers' property`,
			);
		}

		// Register all handlers from the plugin
		for (const [executable, handler] of Object.entries(pluginInstance.handlers)) {
			this.register(executable, handler);
		}
	}

	/**
	 * Load multiple plugins.
	 *
	 * @param plugins - Array of plugin configurations
	 * @param baseDir - Base directory for resolving relative module paths
	 * @returns Array of any errors that occurred during loading (empty if all succeeded)
	 *
	 * @example
	 * ```typescript
	 * const errors = await registry.loadPlugins([
	 *   '@company/sail-vite-plugin',
	 *   { module: './plugins/custom.js' }
	 * ]);
	 * ```
	 */
	public async loadPlugins(
		plugins: TaskHandlerPlugin[],
		baseDir?: string,
	): Promise<Error[]> {
		const errors: Error[] = [];

		for (const plugin of plugins) {
			try {
				await this.loadPlugin(plugin, baseDir);
			} catch (error) {
				const modulePath = typeof plugin === "string" ? plugin : plugin.module;
				errors.push(
					error instanceof Error
						? error
						: new Error(`Failed to load plugin '${modulePath}': ${String(error)}`),
				);
			}
		}

		return errors;
	}

	/**
	 * Get all registered executable names.
	 *
	 * @returns Array of executable names that have registered handlers
	 */
	public getRegisteredExecutables(): string[] {
		return Array.from(this.handlers.keys());
	}

	/**
	 * Clear all registered handlers.
	 * Useful for testing or resetting the registry state.
	 */
	public clear(): void {
		this.handlers.clear();
		this.loadedModules.clear();
	}

	/**
	 * Resolve a module path to an absolute path suitable for import().
	 */
	private resolveModulePath(modulePath: string, baseDir?: string): string {
		// If it's a package name (doesn't start with . or /), return as-is for Node resolution
		if (!modulePath.startsWith(".") && !modulePath.startsWith("/")) {
			return modulePath;
		}

		// For relative/absolute paths, we need to resolve them
		const { resolve } = require("node:path");
		const base = baseDir ?? process.cwd();
		return resolve(base, modulePath);
	}

	/**
	 * Extract a TaskHandler from a loaded module.
	 */
	private extractHandler(
		// biome-ignore lint/suspicious/noExplicitAny: module type is unknown at runtime
		module: any,
		exportName: string | undefined,
		modulePath: string,
	): TaskHandler {
		let handler: unknown;

		if (exportName !== undefined) {
			// Use named export
			handler = module[exportName];
			if (handler === undefined) {
				throw new Error(
					`Module '${modulePath}' does not export '${exportName}'. Available exports: ${Object.keys(
						module,
					).join(", ")}`,
				);
			}
		} else {
			// Use default export
			handler = module.default ?? module;
		}

		// Validate that it's a function (constructor or factory)
		if (typeof handler !== "function") {
			throw new Error(
				`Handler from '${modulePath}' ${exportName ? `(export '${exportName}')` : "(default export)"} must be a function (constructor or factory), got ${typeof handler}`,
			);
		}

		return handler as TaskHandler;
	}

	/**
	 * Type guard to check if an object implements the SailPlugin interface.
	 */
	private isSailPlugin(obj: unknown): obj is SailPlugin {
		return (
			typeof obj === "object" &&
			obj !== null &&
			"handlers" in obj &&
			typeof obj.handlers === "object" &&
			obj.handlers !== null
		);
	}
}
