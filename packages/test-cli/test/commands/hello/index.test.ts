import { runCommand } from "@oclif/test";
import { describe, expect, it } from "vitest";

describe("hello", () => {
	it("runs hello", async () => {
		const { stdout } = await runCommand("hello friend --from oclif", {
			root: import.meta.url,
		});
		expect(stdout).to.contain("hello friend from oclif!");
	});
});
