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
	font-smoothing: antialiased;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

/* Whitespace indicator styles */
:global(.whitespace-indicator) {
	color: #6b7280;
	user-select: none;
	pointer-events: none;
}

:global(.whitespace-indicator.tab),
:global(.whitespace-indicator.newline) {
	font-weight: 600;
}

/* Dark mode adjustments for whitespace indicators */
@media (prefers-color-scheme: dark) {
	:global(.whitespace-indicator) {
		color: #9ca3af;
	}
}
</style>

<pre
	class="inline-block overflow-x-auto bg-slate-50 border border-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 rounded-md p-3 text-sm leading-5 font-mono {className}"
	{...restProps}
	title={showWhitespace ? "Showing whitespace: · = space, » = tab, ¶ = newline" : ""}
><code
	bind:this={codeElement}
	role="code"
>{code}</code></pre>