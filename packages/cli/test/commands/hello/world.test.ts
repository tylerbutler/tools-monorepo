import { runCommand } from "@oclif/test";
import { describe, it } from "mocha";
import { expect } from "chai";

describe("hello:world", () => {
	it("runs hello:world cmd", async () => {
		const { stdout } = await runCommand("hello:world");
		expect(stdout).to.contain("hello world");
	});

	it("runs hello:world --name oclif", async () => {
		const { stdout } = await runCommand("hello:world --name oclif");
		expect(stdout).to.contain("hello oclif");
	});
});
