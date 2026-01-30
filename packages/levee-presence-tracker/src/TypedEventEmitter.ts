/**
 * TypedEventEmitter - a simple typed event emitter implementation.
 */

/**
 * Event signature type for typed events.
 */
export type EventListener<T extends unknown[]> = (...args: T) => void;

/**
 * Event map type - maps event names to argument tuples.
 */
// biome-ignore lint/suspicious/noExplicitAny: needed for generic event map
export type EventMap = { [K: string]: any[] };

/**
 * A simple typed event emitter that provides type-safe event handling.
 *
 * This is a standalone implementation that doesn't depend on Fluid Framework's
 * IEventProvider interface.
 */
export class TypedEventEmitter<TEvents extends EventMap> {
	private readonly listeners = new Map<
		string,
		Set<(...args: unknown[]) => void>
	>();

	/**
	 * Register an event listener.
	 */
	public on<K extends keyof TEvents & string>(
		event: K,
		listener: (...args: TEvents[K]) => void,
	): this {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)?.add(listener as (...args: unknown[]) => void);
		return this;
	}

	/**
	 * Remove an event listener.
	 */
	public off<K extends keyof TEvents & string>(
		event: K,
		listener: (...args: TEvents[K]) => void,
	): this {
		this.listeners.get(event)?.delete(listener as (...args: unknown[]) => void);
		return this;
	}

	/**
	 * Emit an event to all registered listeners.
	 */
	protected emit<K extends keyof TEvents & string>(
		event: K,
		...args: TEvents[K]
	): void {
		const eventListeners = this.listeners.get(event);
		if (eventListeners) {
			for (const listener of eventListeners) {
				listener(...args);
			}
		}
	}
}
