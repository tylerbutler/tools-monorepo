<script lang="ts">
	import { onMount } from "svelte";
	import { ReactiveStateWorkspace } from "$lib/ReactiveStateWorkspace.svelte.js";
	import { connectToFluid, type MousePosition } from "$lib/container.js";
	import type { Attendee } from "@fluidframework/presence/alpha";

	let mouseWorkspace: ReactiveStateWorkspace<MousePosition> | undefined =
		$state();
	let containerId = $state("");
	let status = $state<"connecting" | "connected" | "error">("connecting");
	let errorMessage = $state("");
	let myselfId = $state("");

	// Generate a color from an attendee ID
	function attendeeColor(attendee: Attendee): string {
		let hash = 0;
		const id = attendee.attendeeId;
		for (let i = 0; i < id.length; i++) {
			hash = id.charCodeAt(i) + ((hash << 5) - hash);
		}
		const hue = Math.abs(hash) % 360;
		return `hsl(${hue}, 70%, 50%)`;
	}

	onMount(async () => {
		try {
			const hash = window.location.hash.slice(1);
			const connection = await connectToFluid(hash || undefined);

			containerId = connection.containerId;
			if (!hash) {
				window.location.hash = containerId;
			}

			myselfId = connection.presence.attendees.getMyself().attendeeId;

			mouseWorkspace = new ReactiveStateWorkspace<MousePosition>(
				connection.statesWorkspace.states.mousePosition,
			);

			status = "connected";

			window.addEventListener("mousemove", (e) => {
				if (mouseWorkspace) {
					mouseWorkspace.latest.local = {
						x: e.clientX,
						y: e.clientY,
					};
				}
			});
		} catch (e) {
			status = "error";
			errorMessage = e instanceof Error ? e.message : String(e);
		}
	});
</script>

<svelte:head>
	<title>fluid-svelte demo</title>
</svelte:head>

<div class="app">
	{#if status === "connecting"}
		<div class="overlay">
			<p>Connecting to Tinylicious...</p>
			<p class="hint">Make sure Tinylicious is running: <code>npx tinylicious</code></p>
		</div>
	{:else if status === "error"}
		<div class="overlay error">
			<p>Connection failed</p>
			<p class="hint">{errorMessage}</p>
			<p class="hint">Is Tinylicious running? <code>npx tinylicious</code></p>
		</div>
	{:else if mouseWorkspace}
		<!-- Render remote cursors -->
		{#each mouseWorkspace.data as [attendee, position]}
			{@const isMe = attendee.attendeeId === myselfId}
			{#if !isMe}
				<div
					class="cursor"
					style="left: {position.x}px; top: {position.y}px; background-color: {attendeeColor(attendee)};"
				>
					<svg width="16" height="16" viewBox="0 0 16 16">
						<path d="M0 0 L0 14 L4 10 L8 16 L10 15 L6 9 L12 9 Z" fill="currentColor" />
					</svg>
					<span class="label">{attendee.attendeeId.slice(0, 8)}</span>
				</div>
			{/if}
		{/each}

		<!-- Status bar -->
		<div class="status-bar">
			<span class="badge connected">Connected</span>
			<span class="info">
				Container: <code>{containerId.slice(0, 12)}...</code>
			</span>
			<span class="info">
				Attendees: <strong>{mouseWorkspace.data.size}</strong>
			</span>
			<span class="info you">
				You: <span style="color: {attendeeColor({ attendeeId: myselfId } as Attendee)}">{myselfId.slice(0, 8)}</span>
			</span>
			<button
				onclick={() => {
					navigator.clipboard.writeText(window.location.href);
				}}
			>
				Copy link
			</button>
		</div>

		<div class="instructions">
			<h1>fluid-svelte mouse demo</h1>
			<p>Open this URL in another browser tab to see live cursors.</p>
			<p>Move your mouse around to share your position with other tabs.</p>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, -apple-system, sans-serif;
		overflow: hidden;
		height: 100vh;
		background: #1a1a2e;
		color: #e0e0e0;
	}

	.app {
		position: relative;
		width: 100vw;
		height: 100vh;
	}

	.overlay {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 0.5rem;
	}

	.overlay p {
		margin: 0;
		font-size: 1.2rem;
	}

	.overlay.error p:first-child {
		color: #ff6b6b;
		font-weight: bold;
	}

	.hint {
		font-size: 0.9rem !important;
		color: #888;
	}

	.hint code {
		background: #2a2a3e;
		padding: 0.2em 0.5em;
		border-radius: 4px;
		font-size: 0.85rem;
	}

	.cursor {
		position: fixed;
		pointer-events: none;
		z-index: 1000;
		color: inherit;
		transform: translate(-2px, -2px);
		transition: left 0.05s linear, top 0.05s linear;
	}

	.cursor svg {
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
	}

	.cursor .label {
		position: absolute;
		top: 18px;
		left: 10px;
		font-size: 10px;
		background: inherit;
		color: white;
		padding: 1px 4px;
		border-radius: 3px;
		white-space: nowrap;
		font-family: monospace;
	}

	.status-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 1rem;
		background: #16213e;
		border-top: 1px solid #2a2a3e;
		font-size: 0.85rem;
		z-index: 500;
	}

	.badge {
		padding: 0.15em 0.5em;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.badge.connected {
		background: #1a6b3a;
		color: #4ade80;
	}

	.info {
		color: #999;
	}

	.info code {
		color: #ccc;
		background: #2a2a3e;
		padding: 0.1em 0.3em;
		border-radius: 3px;
	}

	.status-bar button {
		margin-left: auto;
		padding: 0.3em 0.8em;
		background: #2a2a3e;
		color: #ccc;
		border: 1px solid #444;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.status-bar button:hover {
		background: #3a3a5e;
	}

	.instructions {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: calc(100% - 40px);
		text-align: center;
		opacity: 0.5;
	}

	.instructions h1 {
		font-size: 1.8rem;
		margin-bottom: 0.5rem;
	}

	.instructions p {
		margin: 0.25rem 0;
		font-size: 1rem;
	}
</style>
