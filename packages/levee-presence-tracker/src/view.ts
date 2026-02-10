/**
 * View rendering utilities for the presence tracker.
 */

import { Picker } from "emoji-picker-element";

import type { FocusTracker } from "./FocusTracker.js";
import type { MouseTracker } from "./MouseTracker.js";

/**
 * Renders the focus presence panel showing which users have focus.
 */
export function renderFocusPresence(
	focusTracker: FocusTracker,
	div: HTMLDivElement,
): void {
	const wrapperDiv = document.createElement("div");
	wrapperDiv.style.textAlign = "left";
	wrapperDiv.style.margin = "10px";
	div.append(wrapperDiv);

	const focusDiv = document.createElement("div");
	focusDiv.id = "focus-div";
	focusDiv.style.fontSize = "14px";

	const onFocusChanged = (): void => {
		focusDiv.innerHTML = getFocusPresencesString(focusTracker, "<br>");
	};

	onFocusChanged();
	focusTracker.on("focusChanged", onFocusChanged);

	wrapperDiv.append(focusDiv);
}

/**
 * Builds a string representation of all focus presences.
 */
function getFocusPresencesString(
	focusTracker: FocusTracker,
	newLineSeparator = "\n",
): string {
	const focusString: string[] = [];

	for (const [sessionClient, hasFocus] of focusTracker
		.getFocusPresences()
		.entries()) {
		const prefix = `User session ${sessionClient.attendeeId}:`;
		if (hasFocus) {
			focusString.push(`${prefix} has focus`);
		} else {
			focusString.push(`${prefix} missing focus`);
		}
	}
	return focusString.join(newLineSeparator);
}

/**
 * Renders mouse position indicators for remote users.
 */
export function renderMousePresence(
	mouseTracker: MouseTracker,
	focusTracker: FocusTracker,
	div: HTMLDivElement,
): void {
	const onPositionChanged = (): void => {
		div.innerHTML = "";

		for (const [
			sessionClient,
			mousePosition,
		] of mouseTracker.getMousePresences()) {
			if (focusTracker.getFocusPresences().get(sessionClient) === true) {
				const posDiv = document.createElement("div");
				posDiv.textContent = `/${sessionClient.attendeeId}`;
				posDiv.style.position = "absolute";
				posDiv.style.left = `${mousePosition.x}px`;
				posDiv.style.top = `${mousePosition.y - 6}px`;
				posDiv.style.fontWeight = "bold";
				div.append(posDiv);
			}
		}
	};

	onPositionChanged();
	mouseTracker.on("mousePositionChanged", onPositionChanged);
}

/**
 * Renders the control panel with latency slider and emoji picker.
 */
export function renderControlPanel(
	mouseTracker: MouseTracker,
	controlPanel: HTMLDivElement,
): void {
	controlPanel.style.paddingBottom = "10px";

	// Latency slider
	const slider = document.createElement("input");
	slider.type = "range";
	slider.id = "mouse-latency";
	slider.name = "mouse-latency";
	slider.min = "0";
	slider.max = "200";
	slider.defaultValue = "60";

	const sliderLabel = document.createElement("label");
	sliderLabel.htmlFor = "mouse-latency";
	sliderLabel.textContent = `mouse allowableUpdateLatencyMs: ${slider.value}`;

	controlPanel.append(slider);
	controlPanel.append(sliderLabel);

	slider.addEventListener("input", (e: Event): void => {
		sliderLabel.textContent = `mouse allowableUpdateLatencyMs: ${slider.value}`;
		const target = e.target as HTMLInputElement;
		mouseTracker.setAllowableLatency(Number.parseInt(target.value, 10));
	});

	// Reactions configuration
	const reactionsConfigDiv = document.createElement("div");
	reactionsConfigDiv.id = "reactions-config";

	const reactionLabelDiv = document.createElement("div");
	reactionLabelDiv.style.marginTop = "10px";
	reactionLabelDiv.style.marginBottom = "10px";
	reactionLabelDiv.textContent = "Selected reaction:";
	reactionsConfigDiv.append(reactionLabelDiv);

	// Selected emoji display
	const selectedSpan = document.createElement("span");
	selectedSpan.id = "selected-reaction";
	selectedSpan.textContent = "\u2764\uFE0F"; // ❤️
	reactionLabelDiv.append(selectedSpan);

	// Emoji picker
	const picker = new Picker();
	reactionsConfigDiv.append(picker);
	controlPanel.append(reactionsConfigDiv);

	// Update the selected reaction emoji when the picker is clicked
	controlPanel
		.querySelector("emoji-picker")
		?.addEventListener("emoji-click", (event: Event): void => {
			const detail = (event as CustomEvent<{ unicode?: string }>).detail;
			if (detail?.unicode) {
				selectedSpan.textContent = detail.unicode;
			}
		});
}
