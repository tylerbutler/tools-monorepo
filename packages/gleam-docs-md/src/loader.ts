/**
 * An Astro 5+ content collection loader that turns a Gleam
 * `package-interface.json` into one entry per public module, plus an `index`
 * entry. Each entry's `body` is rendered Markdown — wire it through
 * `astro:content`'s `render()` helper in your `[...slug].astro` route to
 * publish the docs.
 *
 * @remarks
 * `astro` is an optional peer dependency. Only import this module from a
 * project that already depends on `astro`.
 *
 * @packageDocumentation
 */

import { readPackageInterface } from "./api.js";
import { renderPackage } from "./render.js";

// Minimal structural type for Astro's Loader so we don't take a hard build-
// time dependency on `astro/loaders`. Mirrors the public shape documented at
// https://docs.astro.build/en/reference/content-loader-reference/.
interface LoaderContext {
	store: {
		clear(): void;
		set(entry: {
			id: string;
			data: Record<string, unknown>;
			body?: string;
			digest?: string;
			rendered?: { html: string; metadata?: Record<string, unknown> };
		}): void;
	};
	logger?: {
		info(message: string): void;
		warn(message: string): void;
	};
	watcher?: {
		add(path: string): void;
	};
	parseData?: (entry: {
		id: string;
		data: Record<string, unknown>;
	}) => Promise<Record<string, unknown>>;
}

interface AstroLoader {
	name: string;
	load(context: LoaderContext): Promise<void> | void;
}

/**
 * Options for {@link gleamDocsLoader}.
 *
 * @beta
 */
export interface GleamDocsLoaderOptions {
	/**
	 * Path to a Gleam `package-interface.json` file. Typically lives under
	 * `build/dev/docs/<package>/package-interface.json` after running
	 * `gleam docs build`.
	 */
	docsJsonPath: string;

	/**
	 * If provided, override the package name expected in the JSON. Defaults
	 * to "use whatever name is in the file".
	 */
	expectedPackageName?: string;
}

/**
 * Build a content loader that emits one entry per Gleam module from a
 * `package-interface.json` file, plus an `index` entry.
 *
 * Each entry's shape:
 * - `id` — slug (`foo-bar` for the module `foo/bar`; `index` for the index).
 * - `data.title` — module name (or `"Reference"` for the index).
 * - `data.description` — one-line description from module docs.
 * - `data.moduleName` — original module name (undefined for the index).
 * - `body` — full Markdown including frontmatter.
 *
 * @beta
 */
export function gleamDocsLoader(options: GleamDocsLoaderOptions): AstroLoader {
	return {
		name: "@tylerbu/gleam-docs-md",
		async load({ store, logger, watcher }) {
			const packageInterface = await readPackageInterface(
				options.docsJsonPath,
				options.expectedPackageName,
			);
			const pages = renderPackage(packageInterface);

			store.clear();
			for (const page of pages) {
				store.set({
					id: page.slug,
					data: {
						title: page.title,
						description: page.description,
						moduleName: page.moduleName,
					},
					body: page.markdown,
				});
			}

			logger?.info(`Loaded ${pages.length} pages from ${options.docsJsonPath}`);
			watcher?.add(options.docsJsonPath);
		},
	};
}
