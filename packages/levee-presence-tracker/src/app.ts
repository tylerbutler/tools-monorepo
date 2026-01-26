/**
 * Main application entry point for the Levee Presence Tracker example.
 *
 * This application demonstrates how to use Fluid Framework's presence features
 * with the Levee client to track page focus and mouse position across
 * multiple connected clients.
 */

import { getPresence } from "@fluidframework/presence/alpha";
import { LeveeClient } from "@tylerbu/levee-client";
import type { ContainerSchema, IFluidContainer } from "fluid-framework";

import { EmptyDOEntry } from "./datastoreFactory.js";
import { FocusTracker } from "./FocusTracker.js";
import { MouseTracker } from "./MouseTracker.js";
import { initializeReactions } from "./reactions.js";
import {
	renderControlPanel,
	renderFocusPresence,
	renderMousePresence,
} from "./view.js";

// Environment configuration from Vite
declare const __VITE_LEVEE_HTTP_URL__: string;
declare const __VITE_LEVEE_SOCKET_URL__: string;
declare const __VITE_LEVEE_TENANT_KEY__: string;

// Define the schema of the Fluid container.
// This example uses the presence features only, so no data object is required.
// But initialObjects is not currently allowed to be empty.
const containerSchema = {
	initialObjects: {
		// schema requires at least one initial object
		nothing: EmptyDOEntry,
	},
} satisfies ContainerSchema;

export type PresenceTrackerSchema = typeof containerSchema;

/**
 * Updates the status indicator in the UI.
 */
function setStatus(
	message: string,
	isError = false,
	isConnected = false,
): void {
	const statusDiv = document.querySelector("#status");
	if (statusDiv) {
		statusDiv.textContent = message;
		statusDiv.className = isError ? "error" : isConnected ? "connected" : "";
	}
}

/**
 * Start the app and render.
 */
async function start(): Promise<void> {
	setStatus("Connecting to Levee server...");

	// Create a unique user ID for this session
	const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

	const client = new LeveeClient({
		connection: {
			httpUrl: __VITE_LEVEE_HTTP_URL__,
			socketUrl: __VITE_LEVEE_SOCKET_URL__,
			tenantKey: __VITE_LEVEE_TENANT_KEY__,
			user: {
				id: userId,
				name: `User ${userId.slice(-5)}`,
			},
		},
	});

	let container: IFluidContainer<PresenceTrackerSchema>;
	let id: string;

	const createNew = location.hash.length === 0;
	if (createNew) {
		setStatus("Creating new container...");
		// Create a new detached container using the schema
		({ container } = await client.createContainer(containerSchema, "2"));

		// Attach the container to upload it to the service
		id = await container.attach();

		// Update the URL with the container ID
		location.hash = id;
	} else {
		id = location.hash.slice(1);
		setStatus(`Loading container ${id}...`);

		// Load the existing container
		({ container } = await client.getContainer(id, containerSchema, "2"));
	}

	setStatus(`Connected: ${id}`, false, true);

	// Get the presence API from the container
	const presence = getPresence(container);

	// Get the states workspace for the tracker data
	const appPresence = presence.states.getWorkspace("name:trackerData", {});

	// Update the browser URL and the window title with the actual container ID
	location.hash = id;
	document.title = `Presence Tracker - ${id}`;

	// Initialize the trackers
	const focusTracker = new FocusTracker(presence, appPresence);
	const mouseTracker = new MouseTracker(presence, appPresence);

	// Initialize reactions support
	initializeReactions(presence, mouseTracker);

	// Render the UI components
	const focusDiv = document.querySelector("#focus-content") as HTMLDivElement;
	renderFocusPresence(focusTracker, focusDiv);

	const mouseContentDiv = document.querySelector(
		"#mouse-position",
	) as HTMLDivElement;
	renderMousePresence(mouseTracker, focusTracker, mouseContentDiv);

	const controlPanelDiv = document.querySelector(
		"#control-panel",
	) as HTMLDivElement;
	renderControlPanel(mouseTracker, controlPanelDiv);

	// Log connection info
	// biome-ignore lint/suspicious/noConsole: intentional logging in example app
	console.info("Connected to Levee server");
	// biome-ignore lint/suspicious/noConsole: intentional logging in example app
	console.info("Container ID:", id);
	// biome-ignore lint/suspicious/noConsole: intentional logging in example app
	console.info("User ID:", userId);
}

// Start the application
start().catch((error) => {
	// biome-ignore lint/suspicious/noConsole: error logging is necessary
	console.error("Failed to start application:", error);
	setStatus(
		`Error: ${error instanceof Error ? error.message : String(error)}`,
		true,
	);
});
