import { ReactiveStateWorkspace } from "$lib/ReactiveStateWorkspace.svelte.js";
import { StateFactory, StatesWorkspace } from "@fluidframework/presence/alpha";

const appPresence = presence.states.getWorkspace("app:v1", {});

interface MouseCoordinate {
	x: number;
	y: number;
}

const ws = appPresence. StateFactory.latest<MouseCoordinate>({
	local: { x: 0, y: 0 },
});

const mouseTracker = new ReactiveStateWorkspace<MouseCoordinate>(ws);
