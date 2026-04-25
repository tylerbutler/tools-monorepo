# astro-tinylytics

## 0.1.0

### Minor Changes

- Adds a full set of Astro components covering every Tinylytics widget and script option: _[`#696`](https://github.com/tylerbutler/tools-monorepo/pull/696) [`40b8125`](https://github.com/tylerbutler/tools-monorepo/commit/40b812507451a96b76f1118cf54f11c880cc8a0d) [@tylerbutler](https://github.com/tylerbutler)_
  - `Script` — renders the Tinylytics embed `<script>` with typed props for every documented URL parameter (`hits`, `kudos`, `uptime`, `countries`, `webring`, `events`, `beacon`, `spa`, `ignore`, `min`, `defer`).
  - `Hits`, `Kudos`, `Countries`, `Uptime` — widget elements that render the markup Tinylytics looks for. Each accepts an `as` prop to override the tag and a `class` prop to append extra class names, and can be opted out of tracking with `ignore`.
  - `Webring` — renders the webring anchor, with optional avatar image (`avatar`, `avatarPosition`, `avatarAlt`) and `newTab` control.
  - `Event` — wraps any element with Tinylytics event-tracking data attributes; auto-renders as `<a>` when `href` is present, `<button>` otherwise, or an explicit tag via `as`.
  - `Pixel` — renders a 1×1 tracking image for RSS feeds, HTML email, and other no-JavaScript contexts.

  Also exports `buildScriptUrl` and `buildPixelUrl` helpers for consumers that want to construct Tinylytics URLs directly.

- Initial release of `astro-tinylytics`. Ships two Astro components for embedding Tinylytics on any Astro site: `Tinylytics` wraps the analytics embed script (with optional `kudos` / `hits` widget flags) and the webmention `<link>` endpoint; `KudosButton` renders a customizable kudos button with a configurable icon, label, count threshold, and suffix template that surfaces a "— and so do N others" phrase once the count exceeds the threshold. Includes an opt-in default stylesheet driven by `--tlt-kudos-*` CSS variables for theming. _[`#693`](https://github.com/tylerbutler/tools-monorepo/pull/693) [`eae499d`](https://github.com/tylerbutler/tools-monorepo/commit/eae499dcac1d52109e4095bb5d4931175ab09641) [@tylerbutler](https://github.com/tylerbutler)_
