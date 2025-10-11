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

// Function to create whitespace indicators using DOM API (XSS-safe)
function createWhitespaceIndicator(
	type: "tab" | "space" | "newline",
	char: string,
): HTMLSpanElement {
	const span = document.createElement("span");
	span.className = `whitespace-indicator ${type}`;
	span.title = type.charAt(0).toUpperCase() + type.slice(1);
	span.textContent = char;
	return span;
}

// Process code text using DOM API instead of innerHTML (XSS-safe)
function processCodeWithDom(text: string, showWhitespace: boolean): void {
	if (!codeElement) {
		return;
	}

	// Clear existing content
	codeElement.textContent = "";

	if (!showWhitespace) {
		// Simple case: just set text content (auto-escapes)
		codeElement.textContent = text;
		return;
	}

	// Process character by character, adding whitespace indicators
	let i = 0;
	while (i < text.length) {
		const char = text[i];

		if (char === "\t") {
			codeElement.appendChild(createWhitespaceIndicator("tab", "»"));
		} else if (char === " ") {
			codeElement.appendChild(createWhitespaceIndicator("space", "·"));
		} else if (char === "\r" && text[i + 1] === "\n") {
			// Handle \r\n
			codeElement.appendChild(createWhitespaceIndicator("newline", "¶"));
			codeElement.appendChild(document.createTextNode("\r\n"));
			i++; // Skip the \n
		} else if (char === "\n") {
			// Handle standalone \n
			codeElement.appendChild(createWhitespaceIndicator("newline", "¶"));
			codeElement.appendChild(document.createTextNode("\n"));
		} else {
			// Regular character - append as text node (auto-escapes)
			codeElement.appendChild(document.createTextNode(char));
		}
		i++;
	}
}

// Update the display when code changes
$effect(() => {
	if (codeElement) {
		processCodeWithDom(code, showWhitespace);
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