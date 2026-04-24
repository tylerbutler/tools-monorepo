---
"astro-tinylytics": minor
---

Adds a full set of Astro components covering every Tinylytics widget and script option:

- `Script` — renders the Tinylytics embed `<script>` with typed props for every documented URL parameter (`hits`, `kudos`, `uptime`, `countries`, `webring`, `events`, `beacon`, `spa`, `ignore`, `min`, `defer`).
- `Hits`, `Kudos`, `Countries`, `Uptime` — widget elements that render the markup Tinylytics looks for. Each accepts an `as` prop to override the tag and a `class` prop to append extra class names, and can be opted out of tracking with `ignore`.
- `Webring` — renders the webring anchor, with optional avatar image (`avatar`, `avatarPosition`, `avatarAlt`) and `newTab` control.
- `Event` — wraps any element with Tinylytics event-tracking data attributes; auto-renders as `<a>` when `href` is present, `<button>` otherwise, or an explicit tag via `as`.
- `Pixel` — renders a 1×1 tracking image for RSS feeds, HTML email, and other no-JavaScript contexts.

Also exports `buildScriptUrl` and `buildPixelUrl` helpers for consumers that want to construct Tinylytics URLs directly.
