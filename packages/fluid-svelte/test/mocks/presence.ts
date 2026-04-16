/**
 * Mock implementations of Fluid Framework presence types for testing.
 */

type EventHandler = (...args: unknown[]) => void;

class MockListenable {
	readonly #handlers = new Map<string, EventHandler[]>();

	on(event: string, handler: EventHandler): () => void {
		if (!this.#handlers.has(event)) {
			this.#handlers.set(event, []);
		}
		this.#handlers.get(event)!.push(handler);
		return () => {
			const handlers = this.#handlers.get(event);
			if (handlers) {
				const idx = handlers.indexOf(handler);
				if (idx !== -1) handlers.splice(idx, 1);
			}
		};
	}

	emit(event: string, ...args: unknown[]): void {
		this.#handlers.get(event)?.forEach((h) => h(...args));
	}
}

export interface MockAttendee {
	readonly attendeeId: string;
	getConnectionId(): string;
	getConnectionStatus(): "Connected" | "Disconnected";
	/** Test helper to change the attendee's connection status. */
	_setStatus(status: "Connected" | "Disconnected"): void;
}

export function createMockAttendee(
	id: string,
	initialStatus: "Connected" | "Disconnected" = "Connected",
): MockAttendee {
	let status = initialStatus;
	return {
		attendeeId: id,
		getConnectionId: () => `conn-${id}`,
		getConnectionStatus: () => status,
		_setStatus: (s) => {
			status = s;
		},
	};
}

export interface MockLatest<T extends object> {
	readonly events: MockListenable;
	readonly presence: {
		readonly attendees: {
			readonly events: MockListenable;
			getMyself(): MockAttendee;
		};
	};
	local: T;

	/** Emit a remoteUpdated event. */
	emitRemoteUpdated(data: {
		attendee: MockAttendee;
		value: T;
		metadata?: { revision: number; timestamp: number };
	}): void;
	/** Emit a localUpdated event. */
	emitLocalUpdated(data: { value: T }): void;
	/** Emit an attendeeDisconnected event on the attendees sub-emitter. */
	emitAttendeeDisconnected(attendee: MockAttendee): void;
}

export function createMockLatest<T extends object>(
	initialLocal: T,
	myselfId = "myself",
): MockLatest<T> {
	const latestEvents = new MockListenable();
	const attendeeEvents = new MockListenable();
	const myself = createMockAttendee(myselfId);

	return {
		events: latestEvents,
		presence: {
			attendees: {
				events: attendeeEvents,
				getMyself: () => myself,
			},
		},
		local: initialLocal,

		emitRemoteUpdated(data) {
			latestEvents.emit("remoteUpdated", {
				attendee: data.attendee,
				value: data.value,
				metadata: data.metadata ?? {
					revision: 1,
					timestamp: Date.now(),
				},
			});
		},

		emitLocalUpdated(data) {
			latestEvents.emit("localUpdated", data);
		},

		emitAttendeeDisconnected(attendee) {
			attendeeEvents.emit("attendeeDisconnected", attendee);
		},
	};
}
