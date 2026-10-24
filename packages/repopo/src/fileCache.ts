import { resolve } from "pathe";
import type { PolicyArgs } from "./policy.js";

/** Internal context shared with policies loaded through different module loaders. */
export const fileCache = Symbol.for("repopo.fileCache");

function cloneToml(value: unknown): unknown {
	if (value instanceof Date) {
		// TomlDate stores date/time kind and offset in private fields.
		return Reflect.construct(value.constructor, [value.toISOString()]);
	}
	if (Array.isArray(value)) {
		return value.map(cloneToml);
	}
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [key, cloneToml(entry)]),
		);
	}
	return value;
}

export class ParsedFileCache {
	private readonly entries = new Map<string, Promise<unknown>>();

	public async read<T>(
		key: string,
		load: () => Promise<T>,
		clone: (value: unknown) => unknown = structuredClone,
	): Promise<T> {
		let pending = this.entries.get(key);
		if (pending === undefined) {
			pending = load();
			this.entries.set(key, pending);
		}
		return clone(await pending) as T;
	}

	public clear(): void {
		this.entries.clear();
	}
}

export function readParsedFile<T>(
	args: PolicyArgs<unknown> & { [fileCache]?: ParsedFileCache | undefined },
	format: "json" | "toml",
	load: () => Promise<T>,
): Promise<T> {
	const cache = args.resolve ? undefined : args[fileCache];
	return cache
		? cache.read(
				JSON.stringify([format, resolve(args.root, args.file)]),
				load,
				format === "toml" ? cloneToml : structuredClone,
			)
		: load();
}
