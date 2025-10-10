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
	console.log("JsonTreeViewer: $effect triggered", {
		hasElement: !!jsonViewerElement,
		hasData: !!data,
		isReady: isComponentReady,
		isInitializing,
		isCustomElementDefined:
			typeof customElements !== "undefined"
				? !!customElements.get("andypf-json-viewer")
				: false,
		isBrowser: typeof window !== "undefined",
	});

	// Only run in browser context when element is available and not already initializing
	if (
		typeof window !== "undefined" &&
		jsonViewerElement &&
		!isComponentReady &&
		!isInitializing
	) {
		isInitializing = true;
		console.log("JsonTreeViewer: Starting web component initialization");

		// Initialize the web component
		(async () => {
			try {
				console.log("JsonTreeViewer: Starting import of @andypf/json-viewer");
				await import("@andypf/json-viewer");
				console.log("JsonTreeViewer: Web component imported successfully");

				// Wait for custom element to be defined with timeout
				if (!customElements.get("andypf-json-viewer")) {
					console.log(
						"JsonTreeViewer: Waiting for custom element to be defined",
					);
					await Promise.race([
						customElements.whenDefined("andypf-json-viewer"),
						new Promise((_, reject) =>
							setTimeout(() => reject(new Error("Timeout")), 5000),
						),
					]);
				}
				console.log("JsonTreeViewer: Custom element defined successfully");

				isComponentReady = true;
				isInitializing = false;

				// Set the data after the component is loaded and defined
				if (jsonViewerElement && data) {
					(jsonViewerElement as any).data = JSON.stringify(data);
					console.log("JsonTreeViewer: Data set on web component:", data);
				}
			} catch (error) {
				console.error("JsonTreeViewer: Failed to load web component:", error);
				console.error("JsonTreeViewer: Error details:", error);
				isInitializing = false;

				// Fallback to JSON.stringify if the web component fails
				if (jsonViewerElement) {
					jsonViewerElement.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
					console.log("JsonTreeViewer: Using fallback JSON.stringify");
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
				console.log("JsonTreeViewer: Updated data on web component:", data);
			} catch (error) {
				console.error("JsonTreeViewer: Failed to update data:", error);
				jsonViewerElement.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
			}
		} else if (!isInitializing) {
			// Use fallback if component not ready and not initializing
			console.log("JsonTreeViewer: Component not ready, using fallback");
			jsonViewerElement.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
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