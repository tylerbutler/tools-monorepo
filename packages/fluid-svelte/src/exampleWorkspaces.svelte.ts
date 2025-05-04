import { ReactiveStateWorkspace } from "$lib/ReactiveStateWorkspace.svelte.js";
import { StateFactory } from "@fluidframework/presence/alpha";

interface MouseCoordinate {
	x: number;
	y: number;
}

const ws = StateFactory.latest<MouseCoordinate>({
  local: { x: 0, y: 0 },
});

const mouseTracker = new ReactiveStateWorkspace<MouseCoordinate>(
	ws,
);
