<script lang="ts">
import type { HTMLAttributes } from "svelte/elements";

interface Props extends Omit<HTMLAttributes<HTMLElement>, "class"> {
	code: string;
	language?: string;
	class?: string;
	showWhitespace?: boolean;
}

let {
	code,
	language = "ccl",
	class: className = "",
	showWhitespace = true,
	...restProps
}: Props = $props();

let codeElement: HTMLElement;

// Function to escape HTML and add whitespace indicators
function processCodeText(text: string): string {
	if (!showWhitespace) {
		// Just escape HTML
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}

	// Escape HTML first, then add whitespace indicators
	const escaped = text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");

	return escaped
		.replace(
			/\t/g,
			'<span class="whitespace-indicator tab" title="Tab">»</span>',
		)
		.replace(
			/ /g,
			'<span class="whitespace-indicator space" title="Space">·</span>',
		)
		.replace(
			/\r\n/g,
			'<span class="whitespace-indicator newline" title="Newline">¶</span>\r\n',
		)
		.replace(
			/(?<!\r)\n/g,
			'<span class="whitespace-indicator newline" title="Newline">¶</span>\n',
		);
}

// Update the display when code changes
$effect(() => {
	if (codeElement) {
		codeElement.innerHTML = processCodeText(code);
	}
});
</script>

<style>
/* Clean, crisp text rendering */
pre, code {
	text-rendering: optimizeLegibility;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

/* Whitespace indicator styles */
:global(.whitespace-indicator) {
	color: var(--color-muted-foreground);
	user-select: none;
	pointer-events: none;
}

:global(.whitespace-indicator.tab),
:global(.whitespace-indicator.newline) {
	font-weight: 600;
}

/* Code block styling using theme variables */
.whitespace-code-block {
	background-color: var(--color-card);
	border: 1px solid var(--color-border);
	color: var(--color-card-foreground);
}
</style>

<pre
	class="inline-block overflow-x-auto rounded-md p-3 text-sm leading-5 font-mono whitespace-code-block {className}"
	{...restProps}
	title={showWhitespace ? "Showing whitespace: · = space, » = tab, ¶ = newline" : ""}
><code
	bind:this={codeElement}
	role="code"
>{code}</code></pre>