import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "@oclif/test";
// import { describe, it } from "mocha";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, "../../..");

describe("hello:world", () => {
	it("runs hello:world cmd", async () => {
		const { stdout } = await runCommand("hello:world", {
			root,
		});
		expect(stdout).to.contain("hello world");
	});

	it("runs hello:world --name oclif", async () => {
		const { stdout } = await runCommand("hello:world --name oclif", {
			root,
		});
		expect(stdout).to.contain("hello oclif");
	});
});
