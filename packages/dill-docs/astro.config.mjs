import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: "Dill",
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
					sidebar: { label: "API Reference", collapsed: true },
				}),
			],
			social: {
				github: "https://github.com/tylerbutler/tools-monorepo/packages/dill",
			},
			sidebar: [
				{
					label: "Start here",
					items: [
						{ label: "What is Dill?", slug: "introduction" },
						{ label: "Installation & usage", slug: "installation" },
						// { label: "Usage", slug: "usage" },
					],
				},
				{
					label: "Guides",
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: "Using the Dill API", slug: "guides/api-usage" },
					],
				},
				// Add the generated sidebar group to the sidebar.
				typeDocSidebarGroup,
			],
		}),
	],
});
