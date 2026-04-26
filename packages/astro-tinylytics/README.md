# astro-tinylytics

Astro components for [Tinylytics](https://tinylytics.app) — analytics, kudos, webmentions, event tracking, webrings, and the no-JS tracking pixel.

## Install

```sh
pnpm add astro-tinylytics
```

Astro `>=4.0.0` is a peer dependency.

## Quickstart

Drop the script into your site `<head>` and place widgets where you want them:

```astro
---
import { Script, Hits, Kudos, Uptime, Countries, Webring } from "astro-tinylytics";
---
<head>
  <Script
    embedCode="YOUR_EMBED_CODE"
    hits
    kudos="custom"
    events
    beacon
    uptime
    countries
    webring="avatars"
  />
</head>

<p>Total visits: <Hits /></p>
<Kudos path="/posts/hello" />
<Uptime /> uptime
<Countries />
<Webring avatar>Random indie site</Webring>
```

## Components

### `<Script>`

Renders the Tinylytics embed `<script>` with typed props for every documented URL flag. Enable each widget / feature with a boolean prop; the component produces the matching query string.

```astro
<Script embedCode="YOUR_EMBED_CODE" hits kudos="custom" events beacon />
<!-- → <script src="https://tinylytics.app/embed/YOUR_EMBED_CODE.js?hits&kudos=custom&events&beacon" defer></script> -->
```

| Prop        | Type                               | Default | Notes                                                                         |
| ----------- | ---------------------------------- | ------- | ----------------------------------------------------------------------------- |
| `embedCode` | `string`                           | —       | Required. Your site's Tinylytics embed code.                                  |
| `min`       | `boolean`                          | `false` | Load the minified `min.js` build.                                             |
| `spa`       | `boolean`                          | `false` | Enable client-routed SPA mode.                                                |
| `ignore`    | `boolean`                          | `false` | Load the script but suppress tracking on this page.                           |
| `hits`      | `boolean \| "unique"`              | —       | `true` → `?hits`, `"unique"` → `?hits=unique`.                                |
| `kudos`     | `boolean \| "custom" \| string`    | —       | `true` → `?kudos`, `"custom"` → `?kudos=custom`, or any custom emoji/string.  |
| `uptime`    | `boolean`                          | `false` | Enable the uptime widget (paid plan).                                         |
| `countries` | `boolean`                          | `false` | Enable the visitor-countries widget.                                          |
| `webring`   | `boolean \| "avatars"`             | —       | `true` → `?webring`, `"avatars"` → `?webring=avatars`.                        |
| `events`    | `boolean`                          | `false` | Enable event tracking (required for `<Event>`).                               |
| `beacon`    | `boolean`                          | `false` | Use `sendBeacon` so link-click events aren't dropped during navigation.       |
| `defer`     | `boolean`                          | `true`  | Emit `defer` on the script tag.                                               |

### `<Hits>`, `<Countries>`, `<Uptime>`

Widget elements the Tinylytics script scans for. Each renders an empty `<span>` by default — the script fills in the content on load.

```astro
<Hits />                          <!-- lifetime hit counter -->
<Countries as="div" class="flags" />
<Uptime class="badge" />
```

| Prop     | Type                         | Default  | Notes                                                       |
| -------- | ---------------------------- | -------- | ----------------------------------------------------------- |
| `as`     | `keyof HTMLElementTagNameMap`| `"span"` | Override the tag.                                           |
| `class`  | `string`                     | —        | Extra class names (merged with the Tinylytics class hook).  |
| `ignore` | `boolean`                    | `false`  | Set `data-ignore="true"` to exclude this instance.          |

### `<Kudos>`

A low-level kudos button. Leave the slot empty to let Tinylytics inject its default `👋 N` content, or provide your own markup (useful with `kudos="custom"` on `<Script>`).

```astro
<Kudos path="/posts/hello" />
<Kudos path="/posts/hello">❤️ Love it</Kudos>
```

| Prop      | Type      | Default       | Notes                                                                |
| --------- | --------- | ------------- | -------------------------------------------------------------------- |
| `path`    | `string`  | current URL   | Pin kudos to a canonical path. Required when multiple buttons share a page. |
| `private` | `boolean` | `false`       | Count visible only to the site owner.                                |
| `ignore`  | `boolean` | `false`       | Set `data-ignore="true"`.                                            |
| `class`   | `string`  | —             | Extra class names.                                                   |

For a higher-level button with icon, label, count threshold, and suffix template, see [`<KudosButton>`](#kudosbutton).

### `<Webring>`

Renders the webring anchor Tinylytics fills with a random ring member on page load. Requires `<Script webring />` (or `webring="avatars"` if `avatar` is used).

```astro
<Webring>Random indie site</Webring>

<Webring avatar avatarPosition="before" avatarAlt="Current ring member">
  Visit next
</Webring>
```

| Prop             | Type                    | Default    | Notes                                                                                |
| ---------------- | ----------------------- | ---------- | ------------------------------------------------------------------------------------ |
| `avatar`         | `boolean`               | `false`    | Render the avatar `<img>`. Script must be loaded with `webring="avatars"`.           |
| `avatarPosition` | `"before" \| "after"`   | `"before"` | Avatar placement relative to the slot.                                               |
| `avatarAlt`      | `string`                | `""`       | Avatar `alt` text. Empty string renders `aria-hidden="true"`.                        |
| `newTab`         | `boolean`               | `true`     | Open in a new tab (`target="_blank" rel="noopener"`).                                |
| `class`          | `string`                | —          | Extra class names.                                                                   |

### `<Event>`

Wraps any element with Tinylytics event-tracking data attributes. Auto-renders as `<a>` when `href` is present, otherwise `<button>`. Pass `as` to force a tag. Extra HTML attributes forward to the rendered element.

Requires `<Script events />` (plus `beacon` if the event navigates away, e.g. an external link or download).

```astro
<Event name="file.download" value="resume.pdf" as="a" href="/resume.pdf">
  Download resume
</Event>

<Event name="nav.menu.open">Menu</Event>
```

Event names use Tinylytics' `category.action` format.

| Prop    | Type                                      | Notes                                                |
| ------- | ----------------------------------------- | ---------------------------------------------------- |
| `name`  | `string`                                  | Required. The event name.                            |
| `value` | `string`                                  | Optional. Stored as `event_properties["value"]`.     |
| `as`    | `"a" \| "button" \| "div" \| "span"`      | Override the inferred tag.                           |

### `<Pixel>`

Renders a 1×1 tracking image for RSS feeds, HTML email, and other no-JavaScript contexts. A hit is registered when the image is fetched.

```astro
<Pixel embedCode="YOUR_EMBED_CODE" path="/posts/hello" />
```

| Prop        | Type     | Notes                                                                              |
| ----------- | -------- | ---------------------------------------------------------------------------------- |
| `embedCode` | `string` | Required.                                                                          |
| `path`      | `string` | Optional. Path to attribute the hit to. A leading `/` is added if missing.         |

### `<KudosButton>`

Opinionated wrapper around `<Kudos>` with a configurable icon, label, count threshold, and suffix template that reveals a "— and so do N others" phrase once the count exceeds the threshold.

```astro
---
import { KudosButton } from "astro-tinylytics";
import "astro-tinylytics/styles.css"; // optional: opt-in default styles
---
<KudosButton path="/my-article-slug" />
```

Customize:

```astro
<KudosButton
  path="/my-article-slug"
  label="Leave a kudo"
  icon="❤️"
  countThreshold={5}
  suffixTemplate="— loved by {count} readers"
  as="span"
  class="my-wrapper-class"
/>
```

| Prop             | Type                | Default                        | Notes                                                                 |
| ---------------- | ------------------- | ------------------------------ | --------------------------------------------------------------------- |
| `path`           | `string`            | —                              | Required. Pins kudos to a canonical path.                             |
| `label`          | `string`            | `"I like this"`                | Rendered as a text label and the button's `aria-label`.               |
| `countThreshold` | `number`            | `10`                           | The suffix is hidden unless the count is strictly greater.            |
| `suffixTemplate` | `string`            | `"— and so do {count} others"` | `{count}` is replaced with the live count.                            |
| `icon`           | `string`            | `"🚀"`                          | Rendered via a CSS `::before` pseudo-element.                         |
| `as`             | `"div" \| "span"`   | `"div"`                        | Wrapper element.                                                      |
| `class`          | `string`            | —                              | Extra class applied to the wrapper.                                   |

Requires the Tinylytics script to be loaded with `kudos="custom"`, which makes the embed inject only the count (a number) into the button. A small observer in the component strips the count out of the button and renders it into the suffix once it clears the threshold.

### `<Tinylytics>` (convenience wrapper)

Higher-level wrapper for the common "analytics OR webmention endpoint" setup. Renders either the embed `<script>` (with optional `kudos` / `hits` flags) **or** the `<link rel="webmention">` — they're typed as mutually exclusive, so call it twice if you need both. For finer control (uptime, countries, events, etc.), use `<Script>` directly.

Imported via subpath (not the barrel):

```astro
---
import Tinylytics from "astro-tinylytics/Tinylytics.astro";
---
<head>
  <Tinylytics embedCode="YOUR_EMBED_CODE" webmention />
  <Tinylytics embedCode="YOUR_EMBED_CODE" kudos="custom" hits />
</head>
```

| Prop         | Type                      | Default | Notes                                                              |
| ------------ | ------------------------- | ------- | ------------------------------------------------------------------ |
| `embedCode`  | `string`                  | —       | Required.                                                          |
| `kudos`      | `boolean \| "custom"`     | `false` | `true` → `?kudos`, `"custom"` → `?kudos=custom`.                   |
| `hits`       | `boolean \| "unique"`     | `false` | `true` → `?hits`, `"unique"` → `?hits=unique`.                     |
| `webmention` | `true`                    | —       | Mutually exclusive with `kudos` / `hits`.                          |

## URL helpers

For consumers that build Tinylytics URLs directly (e.g. for feed generation):

```ts
import { buildScriptUrl, buildPixelUrl } from "astro-tinylytics";

buildScriptUrl({ embedCode: "abc", hits: true, kudos: "custom" });
// → "https://tinylytics.app/embed/abc.js?hits&kudos=custom"

buildPixelUrl("abc", "/posts/hello");
// → "https://tinylytics.app/pixel/abc.gif?path=%2Fposts%2Fhello"
```

## Theming `<KudosButton>`

Importing `styles.css` opts into the default look. Override any of these CSS variables at a higher scope to restyle without rewriting the ruleset:

| Variable                   | Default                  |
| -------------------------- | ------------------------ |
| `--tlt-kudos-fg`           | `inherit`                |
| `--tlt-kudos-bg`           | `transparent`            |
| `--tlt-kudos-border`       | `1px solid currentColor` |
| `--tlt-kudos-radius`       | `4px`                    |
| `--tlt-kudos-padding`      | `4px 10px`               |
| `--tlt-kudos-icon`         | `"🚀"`                    |
| `--tlt-kudos-hover-bg`     | `currentColor`           |
| `--tlt-kudos-hover-fg`     | `white`                  |
| `--tlt-kudos-hover-border` | `currentColor`           |
| `--tlt-kudos-muted`        | `inherit`                |

The `icon` prop writes `--tlt-kudos-icon` as an inline style on each button, so per-instance icons override the global value.

Skip `styles.css` entirely and style the class hooks yourself if you want full control:

- `.tinylytics-kudos-wrapper` — the outer element
- `.tinylytics-kudos-label` — the text label
- `.tinylytics_kudos` — the button (the class the Tinylytics embed script looks for)
- `.tinylytics-kudos-suffix` — the "and so do N others" container (set `hidden` below the threshold)
- `.tinylytics-kudos-count` — the count span inside the suffix

## Starlight

Starlight supports `<head>` overrides via component slots. Create a `Head.astro`:

```astro
---
// src/components/Head.astro
import Default from "@astrojs/starlight/components/Head.astro";
import { Script } from "astro-tinylytics";

const embedCode = import.meta.env.PUBLIC_TINYLYTICS;
---
<Default><slot /></Default>
<link rel="webmention" href={`https://tinylytics.app/webmention/${embedCode}`} />
<Script embedCode={embedCode} hits kudos="custom" events beacon />
```

Then register it in `astro.config.ts`:

```ts
starlight({
  components: {
    Head: "./src/components/Head.astro",
  },
});
```

## License

MIT
