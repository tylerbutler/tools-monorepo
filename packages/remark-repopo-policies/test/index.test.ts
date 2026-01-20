import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { describe, expect, it } from "vitest";
import { remarkRepopoPolicies } from "../src/index.js";

describe("remarkRepopoPolicies", () => {
	describe("plugin structure", () => {
		it("should be a valid unified plugin", async () => {
			const processor = remark().use(remarkGfm).use(remarkRepopoPolicies);
			expect(processor).toBeDefined();
		});

		it("should process markdown without errors when no config exists", async () => {
			const markdown = "# My Project\n\nSome content.";
			const result = await remark()
				.use(remarkGfm)
				.use(remarkRepopoPolicies)
				.process({
					value: markdown,
					path: "/tmp/test/README.md",
				});
			expect(String(result)).toContain("# My Project");
		});
	});
});
