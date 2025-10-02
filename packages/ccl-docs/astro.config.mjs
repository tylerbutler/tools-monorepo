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

// https://astro.build/config
export default defineConfig({
	output: "server",
	adapter: netlify({
		imageCDN: false,
	}),
	site: "https://ccl.tylerbutler.com",
	integrations: [
		starlight({
			title: "CCL",
			description: "CCL (Categorical Configuration Language) documentation",
			lastUpdated: true,
			customCss: [
				// Fontsource files for to regular and semi-bold font weights.
				"@fontsource/ibm-plex-serif/400.css",
				"@fontsource/ibm-plex-serif/600.css",
				"@fontsource/metropolis/400.css",
				"@fontsource/metropolis/600.css",
				"./src/styles/custom.css",
			],
			plugins: [
				starlightLinksValidator(),
				starlightLLMsTxt(),
			],
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/tylerbutler/tools-monorepo",
				},
			],
			sidebar: [
				{
					label: "Getting Started",
					items: [
						{ slug: "documentation-map" },
						{ slug: "getting-started" },
						{ slug: "ccl-syntax" },
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
					],
				},
				{
					label: "Advanced Topics",
					items: [
						{ slug: "dotted-keys-explained" },
						{ slug: "syntax-reference" },
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
