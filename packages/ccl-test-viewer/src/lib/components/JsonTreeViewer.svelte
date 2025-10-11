<script lang="ts">
interface Props {
	data: any;
}

let { data }: Props = $props();

let jsonViewerElement: HTMLElement;
let isComponentReady = $state(false);
let isInitializing = $state(false);

// Initialize the web component when the element is available
$effect(() => {
	// Only run in browser context when element is available and not already initializing
	if (
		typeof window !== "undefined" &&
		jsonViewerElement &&
		!isComponentReady &&
		!isInitializing
	) {
		isInitializing = true;

		// Initialize the web component
		(async () => {
			try {
				await import("@andypf/json-viewer");

				// Wait for custom element to be defined with timeout
				if (!customElements.get("andypf-json-viewer")) {
					await Promise.race([
						customElements.whenDefined("andypf-json-viewer"),
						new Promise((_, reject) =>
							setTimeout(() => reject(new Error("Timeout")), 5000),
						),
					]);
				}

				isComponentReady = true;
				isInitializing = false;

				// Set the data after the component is loaded and defined
				if (jsonViewerElement && data) {
					(jsonViewerElement as any).data = JSON.stringify(data);
				}
			} catch (error) {
				isInitializing = false;

				// Fallback to JSON.stringify if the web component fails (XSS-safe)
				if (jsonViewerElement) {
					const pre = document.createElement("pre");
					pre.textContent = JSON.stringify(data, null, 2);
					jsonViewerElement.textContent = "";
					jsonViewerElement.appendChild(pre);
				}
			}
		})();
	}

	// Update data when component is ready or provide fallback
	if (jsonViewerElement && data) {
		if (
			isComponentReady &&
			typeof customElements !== "undefined" &&
			customElements.get("andypf-json-viewer")
		) {
			try {
				(jsonViewerElement as any).data = JSON.stringify(data);
			} catch (error) {
				// Fallback using DOM API (XSS-safe)
				const pre = document.createElement("pre");
				pre.textContent = JSON.stringify(data, null, 2);
				jsonViewerElement.textContent = "";
				jsonViewerElement.appendChild(pre);
			}
		} else if (!isInitializing) {
			// Use fallback if component not ready and not initializing (XSS-safe)
			const pre = document.createElement("pre");
			pre.textContent = JSON.stringify(data, null, 2);
			jsonViewerElement.textContent = "";
			jsonViewerElement.appendChild(pre);
		}
	}
});
</script>

<!-- Use the andypf-json-viewer web component with railscasts theme -->
<andypf-json-viewer
	bind:this={jsonViewerElement}
	class="json-tree-container"
	theme="railscasts"
	expanded="true"
	show-data-types="false"
	show-toolbar="false"
	indent="2"
></andypf-json-viewer>

<style>
	.json-tree-container {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
		background: var(--muted);
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		padding: 1rem;
		max-height: 500px;
		overflow-y: auto;
		width: 100%;
		display: block;
	}

	/* Style the andypf-json-viewer web component */
	:global(andypf-json-viewer) {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
		width: 100%;
		display: block;
	}

	/* Override any default styling to match our theme */
	:global(andypf-json-viewer::part(container)) {
		background: transparent;
		border: none;
		padding: 0;
	}

	/* Fallback styling for JSON.stringify */
	:global(.json-tree-container pre) {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
		color: var(--foreground);
		margin: 0;
		white-space: pre-wrap;
		word-break: break-word;
	}
</style>