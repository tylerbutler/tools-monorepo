import { ReactiveStateWorkspace } from "$lib/ReactiveStateWorkspace.svelte.js";
import { StateFactory } from "@fluidframework/presence/alpha";
import type { IFluidContainer } from "fluid-framework";
import { getPresence } from "fluid-framework";

interface MouseCoordinate {
	x: number;
	y: number;
}

/**
 * Example: creating a ReactiveStateWorkspace for mouse tracking.
 *
 * In a real app, the container comes from TinyliciousClient.createContainer()
 * or AzureClient.createContainer().
 */
export function createMouseTracker(container: IFluidContainer) {
	const presence = getPresence(container);

	// Define the workspace schema with state factories, then access
	// instantiated state objects via workspace.states
	const appPresence = presence.states.getWorkspace("app:v1", {
		mousePosition: StateFactory.latest<MouseCoordinate>({
			local: { x: 0, y: 0 },
		}),
	});

	return new ReactiveStateWorkspace<MouseCoordinate>(
		appPresence.states.mousePosition,
	);
}
