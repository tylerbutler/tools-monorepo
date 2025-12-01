import netlify from "@astrojs/netlify";
import starlight from "@astrojs/starlight";
import a11yEmoji from "@fec/remark-a11y-emoji";
import { includeMarkdown } from "@hashicorp/platform-remark-plugins";
import { defineConfig } from "astro/config";
// import starlightLinksValidator from "starlight-links-validator";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";

// import deno from "@astrojs/deno";

// Get the current script URL
const scriptUrl = new URL(import.meta.url);

// Get the directory name from the script URL
const rootDir = new URL("../..", import.meta.url).pathname;

// https://astro.build/config
export default defineConfig({
	output: "server",
	// adapter: deno(),
	adapter: netlify({
		// edgeMiddleware: true
	}),
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
			title: "repopo",
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
				// Generate the documentation.
				starlightTypeDoc({
					entryPoints: ["../repopo/src/index.ts"],
					tsconfig: "../repopo/tsconfig.json",
					sidebar: {
						label: "API Reference",
						collapsed: true,
					},
					typeDoc: {
						excludeExternals: true,
						// router: "module",
						// publicPath: "https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo",
						mergeReadme: true,
						readme: "../repopo/api-docs/README.md",
						// readme: "none",
						// entryModule: "index",
						// entryFileName: "index",
						gitRevision: "main",
						sourceLinkTemplate:
							"https://github.com/tylerbutler/tools-monorepo/blob/{gitRevision}/{path}#L{line}",
						plugin: ["typedoc-plugin-mdn-links"],
					},
				}),
				// TODO: Re-enable once problems are fixed.
				// starlightLinksValidator(),
			],
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/tylerbutler/tools-monorepo/packages/repopo",
				},
			],
			sidebar: [
				{
					label: "Start Here",
					items: [
						{
							label: "What is repopo?",
							slug: "introduction",
						},
						{
							label: "Installation",
							slug: "installation",
						},
						// {
						// 	label: "Usage",
						// 	slug: "usage",
						// },
						// { label: "Configuration", slug: "config" },
					],
				},
				{
					label: "Guides",
					autogenerate: { directory: "usage" },
				},
				{
					label: "Policies",
					autogenerate: { directory: "policies" },
				},
				{
					label: "CLI Reference",
					slug: "cli-reference",
				},
				// Add the generated sidebar group to the sidebar.
				typeDocSidebarGroup,
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
