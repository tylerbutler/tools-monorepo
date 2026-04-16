/**
 * Lazily load smol-toml. It's an optional peer dependency, so we import
 * dynamically and surface a clear error when it isn't installed.
 *
 * @internal
 */
export async function parseToml(
	content: string,
): Promise<Record<string, unknown>> {
	try {
		const { parse } = await import("smol-toml");
		return parse(content) as Record<string, unknown>;
	} catch {
		throw new Error(
			"smol-toml is required for TOML-based policies but is not installed. " +
				"Install it with: pnpm add smol-toml",
		);
	}
}
