# repopo-docs

Repopo documentation, built with Astro and Starlight for Cloudflare Workers Static Assets.
The production URL is `https://repopo.tylerbutler.com`.

## Build and preview

Run these commands from the monorepo root:

```bash
corepack enable
pnpm install --frozen-lockfile --ignore-scripts
pnpm exec nx run repopo-docs:build:site
pnpm --filter repopo-docs exec wrangler dev
```

The Nx target compiles workspace dependencies and generates API documentation before
building the site. It does not require Repopo's Rust binary. Astro writes static HTML,
search assets, and a `404.html` page to `packages/repopo-docs/dist`.

For content development with hot reload, use `pnpm --filter repopo-docs dev`.

## Deploy

After building, validate the deployment without uploading:

```bash
pnpm --filter repopo-docs exec wrangler deploy --dry-run
```

Authenticate with `pnpm --filter repopo-docs exec wrangler login`, then deploy:

```bash
pnpm --filter repopo-docs exec wrangler deploy
```

Wrangler reads `packages/repopo-docs/wrangler.jsonc` and uploads its `dist` directory.
No server adapter or Worker script is required. Unknown routes return the generated
404 page with HTTP status 404.

Add `repopo.tylerbutler.com` as a custom domain for the `repopo-docs` Worker in
Cloudflare. Setting Astro's `site` URL does not configure DNS.

## Automatic deployments with Workers Builds

Connect the `tylerbutler/tools-monorepo` repository to the `repopo-docs` Worker.
Use these settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | Repository root (`/`) |
| Build command | `corepack enable && pnpm install --frozen-lockfile --ignore-scripts && pnpm exec nx run repopo-docs:build:site` |
| Deploy command | `pnpm --filter repopo-docs exec wrangler deploy` |
| Preview command | `pnpm --filter repopo-docs exec wrangler preview` |

Set these build variables:

| Variable | Value |
| --- | --- |
| `SKIP_DEPENDENCY_INSTALL` | `1` |
| `NODE_VERSION` | `22.23.1`, matching `executionEnv.nodeVersion` in `pnpm-workspace.yaml` |
| `PNPM_VERSION` | `11.11.0`, matching `packageManager` in the root `package.json` |

Keep installation at the repository root so pnpm can resolve `workspace:^` dependencies.
Keep the build-image versions in sync with the repository pins. Use Cloudflare's
build token or a secret API token; do not put credentials in Wrangler configuration.

To restrict build triggers, include `packages/**`, `config/**`, `nx.json`,
`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `tsconfig*.json`.
Watching `packages/**` covers the docs, Repopo, and their transitive workspace
dependencies.

If a Netlify integration is enabled for this site, disconnect it after switching
deployments. Removing `netlify.toml` does not disable an existing Netlify project.
