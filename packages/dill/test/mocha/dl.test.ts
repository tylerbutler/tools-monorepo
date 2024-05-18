import { expect, test } from "@oclif/test";
import { describe } from "mocha";

describe("dill CLI", () => {
	test
		.stdout()
		.command(["dill", "--help"])
		.it("runs hello", (ctx) => {
			expect(ctx.stdout).to.contain("hello world");
		});

	test
		.stdout()
		.command(["--name", "jeff"])
		.it("runs hello --name jeff", (ctx) => {
			expect(ctx.stdout).to.contain("hello jeff");
		});
});
