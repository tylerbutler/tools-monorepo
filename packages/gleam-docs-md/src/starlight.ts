/**
 * A Starlight plugin that turns a Gleam `package-interface.json` into a set
 * of Markdown pages inside your Starlight `src/content/docs/` directory, and
 * wires them into the sidebar via Starlight's built-in `autogenerate` config.
 *
 * @remarks
 * `@astrojs/starlight` is an optional peer dependency. Only import this
 * module from a Starlight site.
 *
 * Files are written during the Starlight `config:setup` hook, before Astro's
 * file-based routing scans `src/content/docs/`, so the generated pages are
 * indistinguishable from hand-written ones — Pagefind search, `prev/next`
 * navigation, last-updated, and edit links all work.
 *
 * @packageDocumentation
 */

import path from "pathe";
import { generateReference } from "./api.js";

const TRAILING_SLASH = /\/$/;

// Structural-only types so we don't take a hard build-time dependency on
// @astrojs/starlight. Mirrors the StarlightPlugin shape documented at
// https://starlight.astro.build/reference/plugins/.
type StarlightUserConfig = {
	sidebar?: SidebarItem[];
	[key: string]: unknown;
};

type SidebarItem =
	| string
	| {
			label?: string;
			link?: string;
			slug?: string;
			items?:
				| SidebarItem[]
				| [{ autogenerate: { directory: string; collapsed?: boolean } }];
			collapsed?: boolean;
	  };

interface StarlightPluginContext {
	config: StarlightUserConfig;
	updateConfig(newConfig: Partial<StarlightUserConfig>): void;
	astroConfig: { root: URL };
	logger: {
		info(message: string): void;
		warn(message: string): void;
	};
}

interface StarlightPlugin {
	name: string;
	hooks: {
		"config:setup"(context: StarlightPluginContext): Promise<void> | void;
	};
}

/**
 * Options for {@link gleamDocs}.
 *
 * @beta
 */
export interface GleamDocsStarlightOptions {
	/**
	 * Path to a Gleam `package-interface.json` file.
	 *
	 * @remarks
	 * Resolved relative to the Astro project root (the directory containing
	 * `astro.config.mjs`). Use an absolute path if the JSON lives outside
	 * the Astro project root, e.g. `../build/dev/docs/<pkg>/package-interface.json`.
	 */
	docsJsonPath: string;

	/**
	 * Directory under `src/content/docs/` where Markdown pages are written.
	 *
	 * @defaultValue `"reference"`
	 */
	directory?: string;

	/**
	 * Label for the auto-generated sidebar group.
	 *
	 * @defaultValue `"Reference"`
	 */
	sidebarLabel?: string;

	/**
	 * Whether the auto-generated sidebar group starts collapsed.
	 *
	 * @defaultValue `false`
	 */
	collapsed?: boolean;

	/**
	 * If provided, fail the build when the JSON's `name` field doesn't match.
	 */
	expectedPackageName?: string;

	/**
	 * If `true`, do not inject a sidebar group. Use this if you want to
	 * place the generated pages somewhere custom in your sidebar.
	 *
	 * @defaultValue `false`
	 */
	disableSidebar?: boolean;
}

/**
 * Starlight plugin that generates Markdown reference pages from a Gleam
 * `package-interface.json` and injects them into the sidebar.
 *
 * @example
 * ```ts
 * // astro.config.mjs
 * import { gleamDocs } from "@tylerbu/gleam-docs-md/starlight";
 *
 * starlight({
 *   plugins: [
 *     gleamDocs({ docsJsonPath: "../build/dev/docs/my_pkg/package-interface.json" }),
 *   ],
 * });
 * ```
 *
 * @beta
 */
export function gleamDocs(options: GleamDocsStarlightOptions): StarlightPlugin {
	return {
		name: "@tylerbu/gleam-docs-md/starlight",
		hooks: {
			"config:setup": async ({ config, updateConfig, astroConfig, logger }) => {
				const directory = options.directory ?? "reference";
				const sidebarLabel = options.sidebarLabel ?? "Reference";

				const projectRoot = path.normalize(
					astroConfig.root.pathname.replace(TRAILING_SLASH, ""),
				);
				const docsJsonPath = path.isAbsolute(options.docsJsonPath)
					? options.docsJsonPath
					: path.resolve(projectRoot, options.docsJsonPath);
				const outputDir = path.resolve(
					projectRoot,
					"src/content/docs",
					directory,
				);

				const result = await generateReference({
					docsJsonPath,
					outputDir,
					linkPrefix: `/${directory}/`,
					...(options.expectedPackageName === undefined
						? {}
						: { expectedPackageName: options.expectedPackageName }),
				});

				logger.info(
					`Generated ${result.pageCount} reference pages (${result.moduleCount} modules) in src/content/docs/${directory}/`,
				);

				if (options.disableSidebar === true) {
					return;
				}

				updateConfig({
					sidebar: [
						...(config.sidebar ?? []),
						{
							label: sidebarLabel,
							collapsed: options.collapsed ?? false,
							items: [{ autogenerate: { directory } }],
						},
					],
				});
			},
		},
	};
}
