# @tylerbu/astro-tinylytics

Astro components for [Tinylytics](https://tinylytics.app) analytics, kudos buttons, and webmentions.

## Install

```sh
pnpm add @tylerbu/astro-tinylytics
```

Astro `^5.0.0` is a peer dependency.

## Usage

### Analytics + webmentions

The `Tinylytics` component renders either the embed `<script>` (with optional `kudos` and `hits` widget flags) or the `<link rel="webmention">` endpoint — but not both at once. Call it twice if you need both.

```astro
---
import Tinylytics from "@tylerbu/astro-tinylytics/Tinylytics.astro";
---
<head>
  <!-- Webmention endpoint -->
  <Tinylytics embedCode="YOUR_EMBED_CODE" webmention />

  <!-- Analytics script with kudos (custom mode) + hits widget -->
  <Tinylytics embedCode="YOUR_EMBED_CODE" kudos="custom" hits />
</head>
```

Props:

| Prop        | Type                       | Default | Notes                                                             |
| ----------- | -------------------------- | ------- | ----------------------------------------------------------------- |
| `embedCode` | `string`                   | —       | Required. Your site's Tinylytics embed code.                      |
| `kudos`     | `boolean \| "custom"`      | `false` | `true` → `?kudos`. `"custom"` → `?kudos=custom` (inject count only). |
| `hits`      | `boolean \| "unique"`      | `false` | `true` → `?hits`. `"unique"` → `?hits=unique` (paid).             |
| `webmention`| `true`                     | —       | Mutually exclusive with `kudos` / `hits`.                         |

### Kudos button

```astro
---
import KudosButton from "@tylerbu/astro-tinylytics/KudosButton.astro";
import "@tylerbu/astro-tinylytics/styles.css"; // optional: opt-in default styles
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

Props:

| Prop             | Type                | Default                           | Notes                                                                 |
| ---------------- | ------------------- | --------------------------------- | --------------------------------------------------------------------- |
| `path`           | `string`            | —                                 | Required. Pins kudos to a canonical URL path.                         |
| `label`          | `string`            | `"I like this"`                   | Rendered as a text label and as the button's `aria-label`.            |
| `countThreshold` | `number`            | `10`                              | The suffix is hidden unless the kudos count is strictly greater.      |
| `suffixTemplate` | `string`            | `"— and so do {count} others"`    | `{count}` is replaced with the live count.                            |
| `icon`           | `string`            | `"🚀"`                             | Rendered via CSS `::before` on the button.                            |
| `as`             | `"div" \| "span"`   | `"div"`                           | Wrapper element.                                                      |
| `class`          | `string`            | —                                 | Extra class applied to the wrapper.                                   |

The button expects the Tinylytics embed script to be loaded with `?kudos=custom`, which makes it inject only the count (a number) into the button. A small observer in the component strips the count out of the button and renders it into the suffix once it clears the threshold.

## Theming

Importing `styles.css` opts into the default look. Override any of these CSS variables at a higher scope to restyle without rewriting the ruleset:

| Variable                       | Default                  |
| ------------------------------ | ------------------------ |
| `--tlt-kudos-fg`               | `inherit`                |
| `--tlt-kudos-bg`               | `transparent`            |
| `--tlt-kudos-border`           | `1px solid currentColor` |
| `--tlt-kudos-radius`           | `4px`                    |
| `--tlt-kudos-padding`          | `4px 10px`               |
| `--tlt-kudos-icon`             | `"🚀"`                    |
| `--tlt-kudos-hover-bg`         | `currentColor`           |
| `--tlt-kudos-hover-fg`         | `white`                  |
| `--tlt-kudos-hover-border`     | `currentColor`           |
| `--tlt-kudos-muted`            | `inherit`                |

The `icon` prop writes `--tlt-kudos-icon` as an inline style on each button, so per-instance icons override the global value.

Skip `styles.css` entirely and style the class hooks yourself if you want full control:

- `.tinylytics-kudos-wrapper` — the outer element
- `.tinylytics-kudos-label` — the text label
- `.tinylytics_kudos` — the button (the class the Tinylytics embed script looks for)
- `.tinylytics-kudos-suffix` — the "and so do N others" container (set `hidden` below the threshold)
- `.tinylytics-kudos-count` — the count span inside the suffix

## Starlight note

Starlight lets you override the `<head>` via component overrides. Create a `Head.astro` that spreads the default plus your Tinylytics tags:

```astro
---
// src/components/Head.astro
import Default from "@astrojs/starlight/components/Head.astro";
import Tinylytics from "@tylerbu/astro-tinylytics/Tinylytics.astro";
---
<Default><slot /></Default>
<Tinylytics embedCode="YOUR_EMBED_CODE" webmention />
<Tinylytics embedCode="YOUR_EMBED_CODE" kudos="custom" hits />
```

Then register it in `astro.config.ts`:

```ts
starlight({
  components: {
    Head: "./src/components/Head.astro",
  },
});
```

## FAQ

**Why two `Tinylytics` calls instead of one?** The `webmention` variant is typed as mutually exclusive with `kudos`/`hits` — the analytics script and the webmention `<link>` are independent features and intermixing them in a single call obscured that. Passing `webmention` alongside `kudos` is a type error.

## License

MIT
