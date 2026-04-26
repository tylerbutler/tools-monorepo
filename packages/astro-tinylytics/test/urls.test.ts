import { describe, expect, it } from "vitest";
import { buildPixelUrl, buildScriptUrl } from "../src/urls.ts";

describe("buildScriptUrl", () => {
	it("generates a minimal URL with only embedCode", () => {
		expect(buildScriptUrl({ embedCode: "abc123" })).toBe(
			"https://tinylytics.app/embed/abc123.js",
		);
	});

	it("uses the minified URL when min=true", () => {
		expect(buildScriptUrl({ embedCode: "abc123", min: true })).toBe(
			"https://tinylytics.app/embed/abc123/min.js",
		);
	});

	it("appends hits flag", () => {
		expect(buildScriptUrl({ embedCode: "x", hits: true })).toContain("?hits");
		expect(buildScriptUrl({ embedCode: "x", hits: "unique" })).toContain(
			"hits=unique",
		);
	});

	it("does not add hits param when hits is false/undefined", () => {
		const url = buildScriptUrl({ embedCode: "x", hits: false });
		expect(url).not.toContain("hits");
	});

	it("appends kudos flag variants", () => {
		expect(buildScriptUrl({ embedCode: "x", kudos: true })).toContain("kudos");
		expect(buildScriptUrl({ embedCode: "x", kudos: "custom" })).toContain(
			"kudos=custom",
		);
		expect(buildScriptUrl({ embedCode: "x", kudos: "❤️" })).toContain("kudos=❤️");
	});

	it("appends webring flag variants", () => {
		expect(buildScriptUrl({ embedCode: "x", webring: true })).toContain(
			"webring",
		);
		expect(buildScriptUrl({ embedCode: "x", webring: "avatars" })).toContain(
			"webring=avatars",
		);
	});

	it("appends boolean flags", () => {
		const url = buildScriptUrl({
			embedCode: "x",
			uptime: true,
			countries: true,
			events: true,
			beacon: true,
			spa: true,
			ignore: true,
		});
		expect(url).toContain("uptime");
		expect(url).toContain("countries");
		expect(url).toContain("events");
		expect(url).toContain("beacon");
		expect(url).toContain("spa");
		expect(url).toContain("ignore");
	});

	it("builds a realistic URL with multiple flags", () => {
		const url = buildScriptUrl({
			embedCode: "7vP3rWZs",
			hits: true,
			kudos: "custom",
			events: true,
			beacon: true,
			webring: "avatars",
		});
		expect(url).toBe(
			"https://tinylytics.app/embed/7vP3rWZs.js?hits&kudos=custom&webring=avatars&events&beacon",
		);
	});
});

describe("buildPixelUrl", () => {
	it("generates a URL with only embedCode", () => {
		expect(buildPixelUrl("abc123")).toBe(
			"https://tinylytics.app/pixel/abc123.gif",
		);
	});

	it("appends an encoded path parameter", () => {
		expect(buildPixelUrl("abc123", "/posts/hello-world")).toBe(
			"https://tinylytics.app/pixel/abc123.gif?path=%2Fposts%2Fhello-world",
		);
	});

	it("adds a leading slash to the path if missing", () => {
		expect(buildPixelUrl("abc123", "posts/hello")).toBe(
			"https://tinylytics.app/pixel/abc123.gif?path=%2Fposts%2Fhello",
		);
	});
});
