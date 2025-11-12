import type { BaseCommand } from "../baseCommand.js";

/**
 * A capability that can be composed into commands.
 * Capabilities are initialized once and provide functionality to commands.
 *
 * @typeParam TCommand - The command type this capability is attached to.
 *   Uses `BaseCommand<any>` to allow any command constructor type while maintaining
 *   access to BaseCommand methods (error, config, etc.). More specific types can be
 *   provided when implementing capabilities.
 * @typeParam TResult - The type returned by the capability's API.
 *   Defaults to `any` for maximum flexibility - capabilities can return any shape.
 *
 * @beta
 */
export interface Capability<TCommand extends BaseCommand<any>, TResult = any> {
	/**
	 * Initialize the capability. Called automatically when accessed for the first time.
	 * @param command - The command instance this capability is attached to
	 */
	initialize(command: TCommand): Promise<TResult> | TResult;

	/**
	 * Optional cleanup when command completes.
	 */
	cleanup?(): Promise<void> | void;
}

/**
 * Lazy-initialized capability holder.
 * Ensures capabilities are only initialized once, when first accessed.
 *
 * @beta
 */
export class CapabilityWrapper<TCommand extends BaseCommand<any>, TResult> {
	private _initialized = false;
	private _result: TResult | undefined;
	private _initializationPromise: Promise<TResult> | undefined;

	public constructor(
		private readonly command: TCommand,
		private readonly capability: Capability<TCommand, TResult>,
	) {}

	/**
	 * Get the capability, initializing it if needed.
	 * Subsequent calls return cached result.
	 * Concurrent calls will wait for the same initialization promise.
	 */
	public async get(): Promise<TResult> {
		if (this._initialized) {
			return this._result as TResult;
		}

		// If initialization is in progress, wait for it
		if (this._initializationPromise) {
			return this._initializationPromise;
		}

		// Start initialization
		this._initializationPromise = (async () => {
			try {
				this._result = await this.capability.initialize(this.command);
				this._initialized = true;
				return this._result as TResult;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				this.command.error(`Failed to initialize capability: ${message}`, {
					exit: 1,
				});
			}
		})();

		return this._initializationPromise;
	}

	/**
	 * Check if capability has been initialized.
	 */
	public get isInitialized(): boolean {
		return this._initialized;
	}

	/**
	 * Cleanup the capability.
	 */
	public async cleanup(): Promise<void> {
		if (this._initialized && this.capability.cleanup) {
			await this.capability.cleanup();
		}
	}
}
