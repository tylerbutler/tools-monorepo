import fs from "node:fs";
import path from "node:path";

import netlify from "@astrojs/netlify";
import starlight from "@astrojs/starlight";
import a11yEmoji from "@fec/remark-a11y-emoji";
import { includeMarkdown } from "@hashicorp/platform-remark-plugins";
import { defineConfig } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";
import starlightLLMsTxt from "starlight-llms-txt";

// Get the current script URL
const scriptUrl = new URL(import.meta.url);

// Get the directory name from the script URL
const rootDir = new URL("../..", import.meta.url).pathname;

const cclGrammar = JSON.parse(
	fs.readFileSync(
		path.join(path.dirname(scriptUrl.pathname), "ccl.tmLanguage.json"),
		"utf-8",
	),
);

// https://astro.build/config
export default defineConfig({
	output: "server",
	adapter: netlify({
		imageCDN: false,
	}),
	site: "https://ccl.tylerbutler.com",
	// Prevent zod from being externalized to avoid conflicts between
	// Astro's bundled zod v3 and user-installed zod v4
	// See: https://github.com/withastro/astro/issues/14117
	vite: {
		ssr: {
			noExternal: ["zod"],
		},
	},
	integrations: [
		starlight({
			title: "CCL",
			description: "CCL (Categorical Configuration Language) documentation",
			lastUpdated: true,
			customCss: [
				// Fontsource files for to regular and semi-bold font weights.
				// "@fontsource/ibm-plex-serif/400.css",
				// "@fontsource/ibm-plex-serif/600.css",
				"@fontsource/metropolis/400.css",
				"@fontsource/metropolis/600.css",
				// "@fontsource/ibm-plex-mono/400.css",
				// "@fontsource/ibm-plex-mono/600.css",
				"./src/styles/custom.css",
			],
			plugins: [starlightLinksValidator(), starlightLLMsTxt()],
			expressiveCode: {
				shiki: {
					langs: [
						cclGrammar,
						// JSON.parse(fs.readFileSync(path.join(rootDir, "ccl-grammar.json"), "utf-8")),
					],
					langAlias: {
						ccl: "CCL",
						pseudocode: "python",
					},
				},
				styleOverrides: {
					codeFontFamily:
						"'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
				},
			},
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/tylerbutler/tools-monorepo",
				},
			],
			sidebar: [
				{
					label: "For AI Assistants",
					items: [{ slug: "ai-quickstart" }],
				},
				{
					label: "Learning CCL",
					items: [
						{ slug: "getting-started" },
						{ slug: "ccl-examples" },
						{ slug: "ccl-faq" },
					],
				},
				{
					label: "Implementation",
					items: [
						{ slug: "implementing-ccl" },
						{ slug: "parsing-algorithm" },
						{ slug: "library-features" },
						{ slug: "test-suite-guide" },
						{ slug: "behavior-reference" },
					],
				},
				{
					label: "Reference",
					items: [
						{ slug: "syntax-reference" },
						{ slug: "dotted-keys-explained" },
					],
				},
			],
		}),
	],
	markdown: {
		remarkPlugins: [
			a11yEmoji,
			[includeMarkdown, { resolveMdx: true, resolveFrom: rootDir }],
		],
	},
});
