import { describe, expect, it } from "vitest";
// biome-ignore lint/performance/noNamespaceImport: Testing entire module exports
import * as lib from "./index.js";

describe("lib/index.ts exports", () => {
	it("exports UI components", () => {
		// Alert components
		expect(lib).toHaveProperty("Alert");
		expect(lib).toHaveProperty("AlertDescription");
		expect(lib).toHaveProperty("alertVariants");

		// Badge components
		expect(lib).toHaveProperty("Badge");
		expect(lib).toHaveProperty("badgeVariants");

		// Button components
		expect(lib).toHaveProperty("Button");
		expect(lib).toHaveProperty("buttonVariants");

		// Card components
		expect(lib).toHaveProperty("Card");
		expect(lib).toHaveProperty("CardContent");
		expect(lib).toHaveProperty("CardDescription");
		expect(lib).toHaveProperty("CardHeader");
		expect(lib).toHaveProperty("CardTitle");

		// Input and Progress
		expect(lib).toHaveProperty("Input");
		expect(lib).toHaveProperty("Progress");

		// SimpleCheckbox
		expect(lib).toHaveProperty("SimpleCheckbox");
	});

	it("exports utilities", () => {
		expect(lib).toHaveProperty("cn");
		expect(typeof lib.cn).toBe("function");
	});
});
