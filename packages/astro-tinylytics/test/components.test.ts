import { experimental_AstroContainer } from "astro/container";
import { beforeAll, describe, expect, it } from "vitest";
import Countries from "../src/Countries.astro";
import Event from "../src/Event.astro";
import Hits from "../src/Hits.astro";
import Kudos from "../src/Kudos.astro";
import Pixel from "../src/Pixel.astro";
import Script from "../src/Script.astro";
import Uptime from "../src/Uptime.astro";
import Webring from "../src/Webring.astro";

let container: experimental_AstroContainer;

beforeAll(async () => {
	container = await experimental_AstroContainer.create();
});

/** Strip Astro dev-mode source-map attributes that contain absolute paths. */
function clean(html: string): string {
	return html
		.replace(/\s*data-astro-source-file="[^"]*"/g, "")
		.replace(/\s*data-astro-source-loc="[^"]*"/g, "");
}

async function render(
	component: Parameters<typeof container.renderToString>[0],
	options?: Parameters<typeof container.renderToString>[1],
): Promise<string> {
	return clean(await container.renderToString(component, options));
}

// ---------------------------------------------------------------------------
// Script
// ---------------------------------------------------------------------------

describe("Script", () => {
	it("renders a deferred script tag by default", async () => {
		const html = await render(Script, { props: { embedCode: "abc123" } });
		expect(html).toMatchInlineSnapshot(
			`"<script src="https://tinylytics.app/embed/abc123.js" defer></script>"`,
		);
	});

	it("renders without defer when defer=false", async () => {
		const html = await render(Script, {
			props: { embedCode: "abc123", defer: false },
		});
		expect(html).toMatchInlineSnapshot(
			`"<script src="https://tinylytics.app/embed/abc123.js"></script>"`,
		);
	});

	it("uses /min.js URL when min=true", async () => {
		const html = await render(Script, {
			props: { embedCode: "abc123", min: true },
		});
		expect(html).toMatchInlineSnapshot(
			`"<script src="https://tinylytics.app/embed/abc123/min.js" defer></script>"`,
		);
	});

	it("appends query flags", async () => {
		const html = await render(Script, {
			props: {
				embedCode: "abc123",
				hits: true,
				kudos: "custom",
				events: true,
				beacon: true,
			},
		});
		expect(html).toMatchInlineSnapshot(
			`"<script src="https://tinylytics.app/embed/abc123.js?hits&kudos=custom&events&beacon" defer></script>"`,
		);
	});
});

// ---------------------------------------------------------------------------
// Hits
// ---------------------------------------------------------------------------

describe("Hits", () => {
	it("renders a span with tinylytics_hits class", async () => {
		const html = await render(Hits);
		expect(html).toMatchInlineSnapshot(
			`"<span class="tinylytics_hits"></span>"`,
		);
	});

	it("renders slot content", async () => {
		const html = await render(Hits, { slots: { default: "1,234" } });
		expect(html).toMatchInlineSnapshot(
			`"<span class="tinylytics_hits">1,234</span>"`,
		);
	});

	it("renders a custom element via as prop", async () => {
		const html = await render(Hits, { props: { as: "p" } });
		expect(html).toMatchInlineSnapshot(`"<p class="tinylytics_hits"></p>"`);
	});

	it("appends extra class names", async () => {
		const html = await render(Hits, { props: { class: "my-counter big" } });
		expect(html).toMatchInlineSnapshot(
			`"<span class="tinylytics_hits my-counter big"></span>"`,
		);
	});

	it("adds data-ignore when ignore=true", async () => {
		const html = await render(Hits, { props: { ignore: true } });
		expect(html).toMatchInlineSnapshot(
			`"<span data-ignore="true" class="tinylytics_hits"></span>"`,
		);
	});
});

// ---------------------------------------------------------------------------
// Kudos
// ---------------------------------------------------------------------------

describe("Kudos", () => {
	it("renders a button with tinylytics_kudos class", async () => {
		const html = await render(Kudos);
		expect(html).toMatchInlineSnapshot(
			`"<button type="button" class="tinylytics_kudos"></button>"`,
		);
	});

	it("renders slot content", async () => {
		const html = await render(Kudos, { slots: { default: "👋 Like" } });
		expect(html).toMatchInlineSnapshot(
			`"<button type="button" class="tinylytics_kudos">👋 Like</button>"`,
		);
	});

	it("adds data-path when path is provided", async () => {
		const html = await render(Kudos, { props: { path: "/posts/hello" } });
		expect(html).toMatchInlineSnapshot(
			`"<button type="button" class="tinylytics_kudos" data-path="/posts/hello"></button>"`,
		);
	});

	it("adds data-private when private=true", async () => {
		const html = await render(Kudos, { props: { private: true } });
		expect(html).toMatchInlineSnapshot(
			`"<button type="button" class="tinylytics_kudos" data-private="true"></button>"`,
		);
	});

	it("adds data-ignore when ignore=true", async () => {
		const html = await render(Kudos, { props: { ignore: true } });
		expect(html).toMatchInlineSnapshot(
			`"<button type="button" class="tinylytics_kudos" data-ignore="true"></button>"`,
		);
	});
});

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

describe("Countries", () => {
	it("renders a span with tinylytics_countries class", async () => {
		const html = await render(Countries);
		expect(html).toMatchInlineSnapshot(
			`"<span class="tinylytics_countries"></span>"`,
		);
	});

	it("renders a custom element with extra class", async () => {
		const html = await render(Countries, {
			props: { as: "div", class: "flags" },
		});
		expect(html).toMatchInlineSnapshot(
			`"<div class="tinylytics_countries flags"></div>"`,
		);
	});

	it("adds data-ignore when ignore=true", async () => {
		const html = await render(Countries, { props: { ignore: true } });
		expect(html).toMatchInlineSnapshot(
			`"<span data-ignore="true" class="tinylytics_countries"></span>"`,
		);
	});
});

// ---------------------------------------------------------------------------
// Uptime
// ---------------------------------------------------------------------------

describe("Uptime", () => {
	it("renders a span with tinylytics_uptime class", async () => {
		const html = await render(Uptime);
		expect(html).toMatchInlineSnapshot(
			`"<span class="tinylytics_uptime"></span>"`,
		);
	});

	it("renders a custom element with extra class", async () => {
		const html = await render(Uptime, {
			props: { as: "strong", class: "badge" },
		});
		expect(html).toMatchInlineSnapshot(
			`"<strong class="tinylytics_uptime badge"></strong>"`,
		);
	});
});

// ---------------------------------------------------------------------------
// Webring
// ---------------------------------------------------------------------------

describe("Webring", () => {
	it("renders an anchor with tinylytics_webring class opening in a new tab", async () => {
		const html = await render(Webring, { slots: { default: "Random site" } });
		expect(html).toMatchInlineSnapshot(
			`"<a href="#" target="_blank" rel="noopener" class="tinylytics_webring">  Random site  </a>"`,
		);
	});

	it("omits target/rel when newTab=false", async () => {
		const html = await render(Webring, {
			props: { newTab: false },
			slots: { default: "Random site" },
		});
		expect(html).toMatchInlineSnapshot(
			`"<a href="#" class="tinylytics_webring">  Random site  </a>"`,
		);
	});

	it("renders avatar img before slot content by default", async () => {
		const html = await render(Webring, {
			props: { avatar: true },
			slots: { default: "Next" },
		});
		expect(html).toMatchInlineSnapshot(
			`"<a href="#" target="_blank" rel="noopener" class="tinylytics_webring"> <img class="tinylytics_webring_avatar" src="" style="display: none" alt aria-hidden="true"> Next  </a>"`,
		);
	});

	it("renders avatar img after slot content when avatarPosition=after", async () => {
		const html = await render(Webring, {
			props: { avatar: true, avatarPosition: "after" },
			slots: { default: "Next" },
		});
		expect(html).toMatchInlineSnapshot(
			`"<a href="#" target="_blank" rel="noopener" class="tinylytics_webring">  Next <img class="tinylytics_webring_avatar" src="" style="display: none" alt aria-hidden="true"> </a>"`,
		);
	});

	it("sets alt text and removes aria-hidden when avatarAlt is provided", async () => {
		const html = await render(Webring, {
			props: { avatar: true, avatarAlt: "Avatar for example.com" },
			slots: { default: "Next" },
		});
		expect(html).toMatchInlineSnapshot(
			`"<a href="#" target="_blank" rel="noopener" class="tinylytics_webring"> <img class="tinylytics_webring_avatar" src="" style="display: none" alt="Avatar for example.com"> Next  </a>"`,
		);
	});
});

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------

describe("Event", () => {
	it("renders a button when no href is present", async () => {
		const html = await render(Event, {
			props: { name: "nav.click" },
			slots: { default: "Click me" },
		});
		expect(html).toMatchInlineSnapshot(
			`"<button data-tinylytics-event="nav.click">Click me</button>"`,
		);
	});

	it("renders an anchor when href is present", async () => {
		const html = await render(Event, {
			props: { name: "file.download", href: "/resume.pdf" },
			slots: { default: "Download" },
		});
		expect(html).toMatchInlineSnapshot(
			`"<a href="/resume.pdf" data-tinylytics-event="file.download">Download</a>"`,
		);
	});

	it("renders the specified element via as prop", async () => {
		const html = await render(Event, {
			props: { name: "section.view", as: "div" },
			slots: { default: "Content" },
		});
		expect(html).toMatchInlineSnapshot(
			`"<div data-tinylytics-event="section.view">Content</div>"`,
		);
	});

	it("adds data-tinylytics-event-value when value is provided", async () => {
		const html = await render(Event, {
			props: {
				name: "file.download",
				value: "resume.pdf",
				href: "/resume.pdf",
			},
			slots: { default: "Download" },
		});
		expect(html).toMatchInlineSnapshot(
			`"<a href="/resume.pdf" data-tinylytics-event="file.download" data-tinylytics-event-value="resume.pdf">Download</a>"`,
		);
	});
});

// ---------------------------------------------------------------------------
// Pixel
// ---------------------------------------------------------------------------

describe("Pixel", () => {
	it("renders a 1x1 img with the embed code URL", async () => {
		const html = await render(Pixel, { props: { embedCode: "abc123" } });
		expect(html).toMatchInlineSnapshot(
			`"<img src="https://tinylytics.app/pixel/abc123.gif" alt="" width="1" height="1" style="width:1px;height:1px;border:0;" aria-hidden="true" loading="eager">"`,
		);
	});

	it("appends an encoded path parameter", async () => {
		const html = await render(Pixel, {
			props: { embedCode: "abc123", path: "/posts/hello-world" },
		});
		expect(html).toMatchInlineSnapshot(
			`"<img src="https://tinylytics.app/pixel/abc123.gif?path=%2Fposts%2Fhello-world" alt="" width="1" height="1" style="width:1px;height:1px;border:0;" aria-hidden="true" loading="eager">"`,
		);
	});

	it("normalizes a path missing its leading slash", async () => {
		const html = await render(Pixel, {
			props: { embedCode: "abc123", path: "posts/hello" },
		});
		expect(html).toMatchInlineSnapshot(
			`"<img src="https://tinylytics.app/pixel/abc123.gif?path=%2Fposts%2Fhello" alt="" width="1" height="1" style="width:1px;height:1px;border:0;" aria-hidden="true" loading="eager">"`,
		);
	});
});
