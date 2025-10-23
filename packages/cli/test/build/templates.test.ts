import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("build artifacts", () => {
	describe("fluid-repo-overlay templates", () => {
		it("nx.json template exists in compiled output", async () => {
			const templatePath = join(
				process.cwd(),
				"esm/lib/fluid-repo-overlay/templates/nx.json",
			);

			await expect(access(templatePath)).resolves.toBeUndefined();
		});

		it("nx.json template contains valid JSON", async () => {
			const templatePath = join(
				process.cwd(),
				"esm/lib/fluid-repo-overlay/templates/nx.json",
			);
			const content = await readFile(templatePath, "utf-8");

			// Should be valid JSON
			expect(() => JSON.parse(content)).not.toThrow();

			// Verify expected structure
			const parsed = JSON.parse(content);
			expect(parsed.$schema).toBeDefined();
			expect(parsed.extends).toBe("nx/presets/npm.json");
		});

		it("turbo.jsonc template exists in compiled output", async () => {
			const templatePath = join(
				process.cwd(),
				"esm/lib/fluid-repo-overlay/templates/turbo.jsonc",
			);

			await expect(access(templatePath)).resolves.toBeUndefined();
		});

		it("turbo.jsonc template has expected content", async () => {
			const templatePath = join(
				process.cwd(),
				"esm/lib/fluid-repo-overlay/templates/turbo.jsonc",
			);
			const content = await readFile(templatePath, "utf-8");

			// JSONC contains comments, so we can't parse with JSON.parse
			// Instead verify file has content and expected schema reference
			expect(content.length).toBeGreaterThan(0);
			expect(content).toContain('"$schema": "https://turbo.build/schema.json"');
			expect(content).toContain('"tasks"');
		});
	});
});
