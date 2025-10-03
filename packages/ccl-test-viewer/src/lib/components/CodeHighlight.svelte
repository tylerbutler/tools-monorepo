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

// Define CCL language for Prism.js
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

	// Highlight the code
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