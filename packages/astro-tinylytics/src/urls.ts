import type { ScriptProps } from "./types.ts";

/**
 * Builds the Tinylytics embed script URL from ScriptProps.
 */
export function buildScriptUrl(props: ScriptProps): string {
	const {
		embedCode,
		min = false,
		spa = false,
		ignore = false,
		hits,
		kudos,
		uptime = false,
		countries = false,
		webring,
		events = false,
		beacon = false,
	} = props;

	const flags: string[] = [];

	if (hits === "unique") {
		flags.push("hits=unique");
	} else if (hits === true) {
		flags.push("hits");
	}

	if (kudos === true) {
		flags.push("kudos");
	} else if (kudos === "custom") {
		flags.push("kudos=custom");
	} else if (typeof kudos === "string") {
		flags.push(`kudos=${kudos}`);
	}

	if (uptime) {
		flags.push("uptime");
	}
	if (countries) {
		flags.push("countries");
	}

	if (webring === "avatars") {
		flags.push("webring=avatars");
	} else if (webring) {
		flags.push("webring");
	}

	if (events) {
		flags.push("events");
	}
	if (beacon) {
		flags.push("beacon");
	}
	if (spa) {
		flags.push("spa");
	}
	if (ignore) {
		flags.push("ignore");
	}

	const path = min ? `${embedCode}/min.js` : `${embedCode}.js`;
	const query = flags.length > 0 ? `?${flags.join("&")}` : "";
	return `https://tinylytics.app/embed/${path}${query}`;
}

/**
 * Builds the Tinylytics pixel tracking URL.
 */
export function buildPixelUrl(embedCode: string, path?: string): string {
	let src = `https://tinylytics.app/pixel/${embedCode}.gif`;
	if (path) {
		const normalized = path.startsWith("/") ? path : `/${path}`;
		src += `?path=${encodeURIComponent(normalized)}`;
	}
	return src;
}
