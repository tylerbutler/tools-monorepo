import type { BaseCommand } from "../baseCommand.js";

/**
 * A lazy-initialized capability that caches its result after the first access.
 * Concurrent calls to `get()` will share the same initialization promise.
 *
 * @typeParam T - The type returned by the capability.
 *
 * @beta
 */
export interface LazyCapability<T> {
	/**
	 * Get the capability result, initializing it on first access.
	 * Subsequent calls return the cached result.
	 */
	get(): Promise<T>;

	/**
	 * Whether the capability has been initialized.
	 */
	readonly isInitialized: boolean;
}

/**
 * Create a lazy-initialized capability that caches its result.
 * Handles concurrent access by sharing a single initialization promise.
 *
 * @param init - Async function that initializes and returns the capability result.
 * @param onError - Error handler called if initialization fails. Should call `command.error()` or throw.
 * @returns A `LazyCapability` that initializes on first `get()` call.
 *
 * @beta
 */
export function createLazy<T>(
	init: () => Promise<T>,
	// biome-ignore lint/suspicious/noExplicitAny: Generic base type needs 'any' to satisfy BaseCommand<T extends typeof Command> constraint
	command: BaseCommand<any>,
): LazyCapability<T> {
	let initialized = false;
	let result: T | undefined;
	let promise: Promise<T> | undefined;

	return {
		async get(): Promise<T> {
			if (initialized) {
				return result as T;
			}

			if (promise) {
				return promise;
			}

			promise = (async () => {
				try {
					result = await init();
					initialized = true;
					return result;
				} catch (error) {
					const message =
						error instanceof Error ? error.message : String(error);
					command.error(message, { exit: 1 });
				}
			})();

			return promise;
		},

		get isInitialized(): boolean {
			return initialized;
		},
	};
}
