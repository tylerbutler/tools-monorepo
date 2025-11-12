import type { BaseCommand } from "../baseCommand.js";

/**
 * A capability that can be composed into commands.
 * Capabilities are initialized once and provide functionality to commands.
 *
 * @template TCommand - The command type this capability is attached to
 * @template TResult - The type returned by the capability's API
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
 */
export class CapabilityHolder<TCommand extends BaseCommand<any>, TResult> {
	private _initialized = false;
	private _result: TResult | undefined;
	private readonly capability: Capability<TCommand, TResult>;
	private readonly command: TCommand;

	constructor(command: TCommand, capability: Capability<TCommand, TResult>) {
		this.command = command;
		this.capability = capability;
	}

	/**
	 * Get the capability, initializing it if needed.
	 * Subsequent calls return cached result.
	 */
	async get(): Promise<TResult> {
		if (!this._initialized) {
			this._result = await this.capability.initialize(this.command);
			this._initialized = true;
		}
		return this._result as TResult;
	}

	/**
	 * Check if capability has been initialized.
	 */
	get isInitialized(): boolean {
		return this._initialized;
	}

	/**
	 * Cleanup the capability.
	 */
	async cleanup(): Promise<void> {
		if (this._initialized && this.capability.cleanup) {
			await this.capability.cleanup();
		}
	}
}
