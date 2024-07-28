import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
// import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: "My Docs",
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
					label: "Guides",
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: "Example Guide", slug: "guides/example" },
					],
				},
				{
					label: "Reference",
					autogenerate: { directory: "reference" },
				},
				// Add the generated sidebar group to the sidebar.
        typeDocSidebarGroup,
			],
		}),
	],
});
