/**
 * Reactions support for the presence tracker.
 *
 * Initializes a notifications workspace for sending and receiving
 * emoji reactions that appear at the user's cursor position.
 */

import type {
	Attendee,
	Presence,
	PresenceWithNotifications,
} from "@fluidframework/presence/alpha";
import { Notifications } from "@fluidframework/presence/alpha";

import type { IMousePosition, MouseTracker } from "./MouseTracker.js";

/**
 * Initializes reactions support for the app.
 *
 * Initialization will create a presence Notifications workspace and connect
 * relevant event handlers. Reaction elements are added to the DOM in response
 * to incoming notifications. These DOM elements are automatically removed
 * after a timeout.
 */
export function initializeReactions(
	presence: Presence,
	mouseTracker: MouseTracker,
): void {
	// Create a notifications workspace to send reactions-related notifications.
	// Cast to PresenceWithNotifications to access the alpha notifications API
	const notificationsWorkspace = (
		presence as PresenceWithNotifications
	).notifications.getWorkspace("name:reactions", {
		// Initialize a notifications manager with the provided message schema.
		reactions: Notifications<{
			reaction: (position: { x: number; y: number }, value: string) => void;
		}>({
			reaction: onReaction,
		}),
	});

	// Send a reaction to all clients on click.
	document.body.addEventListener("click", () => {
		// Get the current reaction value
		const selectedReaction = document.querySelector(
			"#selected-reaction",
		) as HTMLSpanElement;
		const reactionValue = selectedReaction.textContent;

		// Check that we're connected before sending notifications.
		if (presence.attendees.getMyself().getConnectionStatus() === "Connected") {
			notificationsWorkspace.notifications.reactions.emit.broadcast(
				"reaction",
				mouseTracker.getMyMousePosition(),
				reactionValue ?? "?",
			);
		}
	});
}

/**
 * Renders reactions to the window using absolute positioning.
 */
function onReaction(
	_client: Attendee,
	position: IMousePosition,
	value: string,
): void {
	const reactionDiv = document.createElement("div");
	reactionDiv.className = "reaction";
	reactionDiv.style.position = "absolute";
	reactionDiv.style.left = `${position.x}px`;
	reactionDiv.style.top = `${position.y}px`;
	reactionDiv.textContent = value;
	document.body.append(reactionDiv);

	setTimeout(() => {
		reactionDiv.remove();
	}, 1000);
}
