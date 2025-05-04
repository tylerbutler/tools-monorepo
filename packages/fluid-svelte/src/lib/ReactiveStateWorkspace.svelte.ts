import type {
	Attendee,
	LatestClientData,
	LatestRaw,
} from "@fluidframework/presence/alpha";
import { SvelteMap } from "svelte/reactivity";

// temporary type
type Latest<T> = LatestRaw<T>;

/**
 * A class that wraps a Fluid Framework presence state workspace in Svelte state so the data becomes reactive when used
 * in Svelte. This enables easy binding of Presence data in the view/template.
 */
export class ReactiveStateWorkspace<
	T extends object,
	L extends LatestRaw<T> | Latest<T> = LatestRaw<T>,
> {
	/**
	 * Storage for the reactive state. The map is keyed by Attendee.
	 */
	protected readonly reactiveState = $state(new SvelteMap<Attendee, T>());

	/**
	 * Visible reactive presence data. Disconnected attendees are excluded. Use `unfilteredData` if you want to include
	 * disconnected attendees.
	 */
	public readonly data = $derived.by(() => {
		return new SvelteMap(
			[...this.reactiveState].filter(
				([session]) => session.getConnectionStatus() === "Connected",
			),
		);
	});

	/**
	 * All reactive presence data, including that of disconnected attendees.
	 */
	public readonly unfilteredData = $derived(this.reactiveState);

	public get local() {
		return this.latest.local;
	}

	constructor(public readonly latest: L) {
		// Wire up event listener to update the reactive map when the remote users' data is updated
		latest.events.on("remoteUpdated", (data: LatestClientData<T>) => {
			this.reactiveState.set(data.attendee, data.value as T);
		});

		latest.events.on("localUpdated", (data) => {
			// Update the selection state with the new coordinate
			this.reactiveState.set(
				latest.presence.attendees.getMyself(),
				data.value as T,
			);
		});

		latest.presence.attendees.events.on(
			"attendeeDisconnected",
			(session: Attendee) => {
				this.reactiveState.delete(session);
			},
		);
	}
}
