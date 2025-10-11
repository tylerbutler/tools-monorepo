<script lang="ts">
import Prism from "prismjs";

// Import basic components
import "prismjs/components/prism-core";
import "prismjs/components/prism-clike";

// Import Prism themes
import "prismjs/themes/prism.css";

import type { HTMLAttributes } from "svelte/elements";

interface Props extends Omit<HTMLAttributes<HTMLElement>, "class"> {
	code: string;
	language?: string;
	class?: string;
}

let {
	code,
	language = "ccl",
	class: className = "",
	...restProps
}: Props = $props();

let codeElement: HTMLElement;

// Define regex patterns at module level for performance
const CCL_COMMENT_PATTERN = /\/=.*/;
const CCL_STRING_PATTERN = /"(?:[^"\\]|\\.)*"/;
const CCL_NUMBER_PATTERN = /\b\d+(?:\.\d+)?\b/;
const CCL_BOOLEAN_PATTERN = /\b(?:true|false)\b/;
const CCL_KEY_PATTERN = /^[^=\n]+(?==)/m;
const CCL_DOTTED_PATTERN = /\./;
const CCL_IDENTIFIER_PATTERN = /[^.\s=]+/;
const CCL_OPERATOR_PATTERN = /=/;
const CCL_PUNCTUATION_PATTERN = /[{}[\],]/;

// Define CCL language for Prism.js
$effect(() => {
	// Define CCL language syntax
	Prism.languages.ccl = {
		comment: {
			pattern: CCL_COMMENT_PATTERN,
			greedy: true,
		},
		string: {
			pattern: CCL_STRING_PATTERN,
			greedy: true,
		},
		number: CCL_NUMBER_PATTERN,
		boolean: CCL_BOOLEAN_PATTERN,
		key: {
			pattern: CCL_KEY_PATTERN,
			inside: {
				dotted: CCL_DOTTED_PATTERN,
				identifier: CCL_IDENTIFIER_PATTERN,
			},
		},
		operator: CCL_OPERATOR_PATTERN,
		punctuation: CCL_PUNCTUATION_PATTERN,
	};

	// Highlight the code
	// Note: Prism.highlight() safely escapes HTML before adding syntax highlighting
	if (codeElement) {
		codeElement.innerHTML = Prism.highlight(
			code,
			Prism.languages[language] || Prism.languages.ccl,
			language,
		);
	}
});
</script>

<pre class="overflow-x-auto bg-muted border border-border rounded-md p-3 text-sm {className}" {...restProps}><code bind:this={codeElement} class="language-{language}">{code}</code></pre>