---
"@tylerbu/astro-tinylytics": minor
---

Initial release of `@tylerbu/astro-tinylytics`. Ships two Astro components for embedding Tinylytics on any Astro site: `Tinylytics` wraps the analytics embed script (with optional `kudos` / `hits` widget flags) and the webmention `<link>` endpoint; `KudosButton` renders a customizable kudos button with a configurable icon, label, count threshold, and suffix template that surfaces a "— and so do N others" phrase once the count exceeds the threshold. Includes an opt-in default stylesheet driven by `--tlt-kudos-*` CSS variables for theming.
