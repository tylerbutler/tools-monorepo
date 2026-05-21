# @tylerbu/gleam-docs-md

Generate Markdown reference documentation from a Gleam package's
`package-interface.json` file.

The renderer mirrors the conventions used by
[gleamoire](https://github.com/GearsDatapacks/gleamoire) (Apache-2.0):
type-variable naming (`a`, `b`, `c`, …), current-module qualifier elision,
multi-line constructors and function parameters, sum-type blocks, and
deprecation notices.

After running `gleam docs build`, a `package-interface.json` file is generated
under `build/dev/docs/<package>/`. This package gives you three ways to turn it
into rendered docs.

## Install

```bash
pnpm add -D @tylerbu/gleam-docs-md
```

## 1. CLI

```bash
gleam-docs-md build/dev/docs/my_pkg/package-interface.json \
  --out website/src/content/docs/reference
```

The output is plain CommonMark with Starlight-flavoured admonitions
(`:::caution[Deprecated]`) and works with any static site generator.

## 2. Starlight plugin (recommended for Starlight sites)

Generates Markdown into your Starlight `src/content/docs/<dir>/` during the
`config:setup` hook and auto-wires the sidebar. The output pages are
indistinguishable from hand-written docs — search, prev/next nav, and edit
links all work.

```ts
// astro.config.mjs
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import { gleamDocs } from "@tylerbu/gleam-docs-md/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "my_pkg",
      plugins: [
        gleamDocs({
          docsJsonPath: "../build/dev/docs/my_pkg/package-interface.json",
        }),
      ],
    }),
  ],
});
```

Options:

| Option | Default | Description |
|---|---|---|
| `docsJsonPath` | _required_ | Path to `package-interface.json`. Relative paths resolve against the Astro project root. |
| `directory` | `"reference"` | Directory under `src/content/docs/` to write into. |
| `sidebarLabel` | `"Reference"` | Label for the injected sidebar group. |
| `collapsed` | `false` | Whether the sidebar group starts collapsed. |
| `expectedPackageName` | _none_ | Fail the build if the JSON's `name` field doesn't match. |
| `disableSidebar` | `false` | Skip the sidebar injection if you'd rather wire it manually. |

## 3. Astro content collection loader (non-Starlight Astro sites)

For Astro sites that don't use Starlight, expose the modules as a typed
content collection:

```ts
// src/content.config.ts
import { defineCollection } from "astro:content";
import { gleamDocsLoader } from "@tylerbu/gleam-docs-md/loader";

export const collections = {
  reference: defineCollection({
    loader: gleamDocsLoader({
      docsJsonPath: "build/dev/docs/my_pkg/package-interface.json",
    }),
  }),
};
```

```astro
---
// src/pages/reference/[...slug].astro
import { getCollection, render } from "astro:content";

export async function getStaticPaths() {
  const pages = await getCollection("reference");
  return pages.map((page) => ({ params: { slug: page.id }, props: { page } }));
}

const { Content } = await render(Astro.props.page);
---
<Content />
```

Each entry carries `data.title`, `data.description`, `data.moduleName`, plus
the rendered Markdown as `body`.

## Programmatic API

```ts
import { generateReference, renderPackage, readPackageInterface } from "@tylerbu/gleam-docs-md";

// One-shot: render and write to disk.
const result = await generateReference({
  docsJsonPath: "build/dev/docs/my_pkg/package-interface.json",
  outputDir: "website/src/content/docs/reference",
});

// Or: parse + render in memory.
const pkg = await readPackageInterface(
  "build/dev/docs/my_pkg/package-interface.json",
);
const pages = renderPackage(pkg);
for (const page of pages) {
  console.log(page.slug, page.title, page.markdown.length);
}
```

## Credits

The Gleam-formatted code rendering is a TypeScript port of
[gleamoire](https://github.com/GearsDatapacks/gleamoire)'s `render.gleam`.
The original Node script lives in
[gluegun](https://github.com/tylerbutler/gluegun)'s website scripts.
