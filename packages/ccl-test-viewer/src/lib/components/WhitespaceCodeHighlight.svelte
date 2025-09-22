<script lang="ts">
import Prism from "prismjs";
import "prismjs/components/prism-core";
import "prismjs/components/prism-clike";
import "prismjs/themes/prism.css";
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

// Function to replace whitespace characters with visible indicators in raw text
function addWhitespaceIndicators(text: string): string {
	if (!showWhitespace) return text;

	return text
		.replace(/\t/g, "»") // Tab (double right-angle)
		.replace(/ /g, "·") // Space (middle dot)
		.replace(/\r\n/g, "¶\r\n") // CRLF (paragraph sign)
		.replace(/(?<!\r)\n/g, "¶\n"); // LF (paragraph sign)
}

// Function to add whitespace styling after Prism highlighting
function addWhitespaceCSS(html: string): string {
	if (!showWhitespace) return html;

	return html
		.replace(
			/»/g,
			'<span class="whitespace-indicator tab" title="Tab">»</span>',
		)
		.replace(
			/·/g,
			'<span class="whitespace-indicator space" title="Space">·</span>',
		)
		.replace(
			/¶/g,
			'<span class="whitespace-indicator newline" title="Newline">¶</span>',
		);
}

// Define CCL language for Prism.js and apply whitespace indicators
$effect(() => {
	// Define CCL language syntax
	Prism.languages.ccl = {
		comment: {
			pattern: /\/=.*/,
			greedy: true,
		},
		string: {
			pattern: /"(?:[^"\\]|\\.)*"/,
			greedy: true,
		},
		number: /\b\d+(?:\.\d+)?\b/,
		boolean: /\b(?:true|false)\b/,
		key: {
			pattern: /^[^=\n]+(?==)/m,
			inside: {
				dotted: /\./,
				identifier: /[^.\s=]+/,
			},
		},
		operator: /=/,
		punctuation: /[{}[\],]/,
	};

	// Apply whitespace indicators first, then highlight
	if (codeElement) {
		const textWithWhitespace = addWhitespaceIndicators(code);
		const highlighted = Prism.highlight(
			textWithWhitespace,
			Prism.languages[language] || Prism.languages.ccl,
			language,
		);

		// Add CSS classes to the whitespace indicators
		codeElement.innerHTML = addWhitespaceCSS(highlighted);
	}
});
</script>

<style>
/* Whitespace indicator styles */
:global(.whitespace-indicator) {
	opacity: 1.0;
	font-size: 0.9em;
	color: #374151;
	user-select: none;
	pointer-events: none;
}

:global(.whitespace-indicator.space) {
	color: #374151;
	font-size: 1em;
}

:global(.whitespace-indicator.tab) {
	color: #374151;
	font-weight: bold;
	font-size: 1em;
}

:global(.whitespace-indicator.newline) {
	color: #374151;
	font-weight: bold;
	font-size: 1em;
}

/* Dark mode adjustments for whitespace indicators */
@media (prefers-color-scheme: dark) {
	:global(.whitespace-indicator) {
		color: #94a3b8; /* slate-400 for dark mode */
	}

	:global(.whitespace-indicator.space),
	:global(.whitespace-indicator.tab),
	:global(.whitespace-indicator.newline) {
		color: #94a3b8; /* slate-400 for dark mode */
	}
}
</style>

<pre
	class="inline-block overflow-x-auto bg-slate-50 border border-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 rounded-md p-3 text-sm leading-5 font-mono {className}"
	{...restProps}
	title={showWhitespace ? "Showing whitespace: · = space, » = tab, ¶ = newline" : ""}
><code
	bind:this={codeElement}
	class="language-{language}"
	role="code"
>{code}</code></pre>