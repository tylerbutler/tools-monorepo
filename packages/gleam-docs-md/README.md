# gleam-docs-md

Generate Markdown reference documentation from a Gleam package's `package-interface.json` file.

The renderer mirrors the conventions used by [gleamoire](https://github.com/GearsDatapacks/gleamoire) (Apache-2.0): type-variable naming (`a`, `b`, `c`, …), current-module qualifier elision, multi-line constructors and function parameters, sum-type blocks, and deprecation notices.

## Install

```bash
pnpm add -D @tylerbu/gleam-docs-md
```

## CLI

After running `gleam docs build`, a `package-interface.json` file is generated under `build/dev/docs/<package>/`. Point `gleam-docs-md` at it to emit one Markdown page per module, plus an `index.md`:

```bash
gleam-docs-md build/dev/docs/my_pkg/package-interface.json \
  --out website/src/content/docs/reference
```

The output is formatted for Astro [Starlight](https://starlight.astro.build/) but is plain CommonMark and works for any static site generator.

## Programmatic API

```ts
import { generateReference } from "@tylerbu/gleam-docs-md";

const result = await generateReference({
  docsJsonPath: "build/dev/docs/my_pkg/package-interface.json",
  outputDir: "website/src/content/docs/reference",
});

console.log(`Wrote ${result.pageCount} pages (${result.moduleCount} modules).`);
```

## Credits

The Gleam-formatted code rendering is a TypeScript port of
[gleamoire](https://github.com/GearsDatapacks/gleamoire)'s `render.gleam`.
The original Node script lives in
[gluegun](https://github.com/tylerbutler/gluegun)'s website scripts.
