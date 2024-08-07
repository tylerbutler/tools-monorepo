import netlify from "@astrojs/netlify";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";
// import deno from "@astrojs/deno";

// https://astro.build/config
export default defineConfig({
	output: "server",
	// adapter: deno(),
	adapter: netlify({ edgeMiddleware: true }),
	integrations: [
		starlight({
			title: "dill",
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
					entryPoints: ["../dill/src/index.ts"],
					tsconfig: "../dill/tsconfig.json",
					sidebar: {
						label: "API Reference",
						collapsed: true,
					},
					typeDoc: {
						excludeExternals: true,
						// outputFileStrategy: "modules",
						// publicPath: "https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill",
						mergeReadme: true,
						readme: "../dill/api-docs/README.md",
						// readme: "none",
						// entryModule: "index",
						// entryFileName: "index",
						gitRevision: "main",
						sourceLinkTemplate:
							"https://github.com/tylerbutler/tools-monorepo/blob/{gitRevision}/{path}#L{line}",
						plugin: ["typedoc-plugin-mdn-links"],
					},
				}),
				starlightLinksValidator({
					errorOnRelativeLinks: true,
				}),
			],
			social: {
				github: "https://github.com/tylerbutler/tools-monorepo/packages/dill",
			},
			sidebar: [
				{
					label: "Start here",
					items: [
						{
							label: "What is dill?",
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
						// { label: "Other uses", slug: "other-uses" },
					],
				},
				{
					label: "Guides",
					autogenerate: { directory: "usage" },
				},
				// {
				// 	label: "API Summary",
				// },
				// Add the generated sidebar group to the sidebar.
				typeDocSidebarGroup,
			],
		}),
	],
});
