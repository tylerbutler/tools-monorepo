import { access } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("build artifacts", () => {
	describe("fluid-repo-overlay templates", () => {
		it("nx.json template exists in compiled output", async () => {
			const templatePath = join(
				process.cwd(),
				"esm/lib/fluid-repo-overlay/templates/nx.json",
			);

			await expect(access(templatePath)).resolves.not.toThrow();
		});

		it("turbo.jsonc template exists in compiled output", async () => {
			const templatePath = join(
				process.cwd(),
				"esm/lib/fluid-repo-overlay/templates/turbo.jsonc",
			);

			await expect(access(templatePath)).resolves.not.toThrow();
		});
	});
});
