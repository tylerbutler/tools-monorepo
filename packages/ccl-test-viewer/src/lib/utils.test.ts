import { describe, expect, it } from "vitest";
import { cn } from "./utils.js";

describe("utils", () => {
	describe("cn (className utility)", () => {
		it("merges class names correctly", () => {
			expect(cn("class1", "class2")).toBe("class1 class2");
		});

		it("handles conditional classes", () => {
			expect(cn("class1", "class2", false)).toBe("class1 class2");
		});

		it("handles empty and undefined values", () => {
			expect(cn("class1", "", undefined, null, "class2")).toBe("class1 class2");
		});

		it("merges Tailwind classes correctly", () => {
			// Should handle conflicting classes and keep the last one
			expect(cn("p-4 p-2")).toBe("p-2");
			expect(cn("bg-red-500 bg-blue-500")).toBe("bg-blue-500");
		});

		it("handles complex class combinations", () => {
			const result = cn(
				"base-class",
				{
					"conditional-class": true,
					"hidden-class": false,
				},
				["array-class-1", "array-class-2"],
				"final-class",
			);

			expect(result).toContain("base-class");
			expect(result).toContain("conditional-class");
			expect(result).not.toContain("hidden-class");
			expect(result).toContain("array-class-1");
			expect(result).toContain("array-class-2");
			expect(result).toContain("final-class");
		});
	});
});
