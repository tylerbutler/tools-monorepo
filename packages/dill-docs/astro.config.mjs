import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
// import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: "Dill",
			customCss: ["./src/styles/custom.css"],
			plugins: [
				// Generate the documentation.
				// starlightTypeDoc({
				//   entryPoints: ['../dill/src/index.ts'],
				//   tsconfig: './tsconfig.json',
				// }),
			],
			social: {
				github: "https://github.com/tylerbutler/tools-monorepo/packages/dill",
			},
			sidebar: [
				{
					label: "Start here",
					items: [
						{ label: "What is dill?", slug: "introduction" },
						{ label: "Installation", slug: "installation" },
						{ label: "Usage", slug: "usage" },
					],
				},
				{
					label: "Guides",
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: "Example Guide", slug: "guides/example" },
					],
				},
				// Add the generated sidebar group to the sidebar.
				// typeDocSidebarGroup,
			],
		}),
	],
});
