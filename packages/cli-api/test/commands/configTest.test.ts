import { runCommand } from "@oclif/test";
import { describe, expect, it } from "vitest";

// import { type TestConfigSchema, testDataPath } from "./common.js";

// import { testDataPath, testUrls } from "../common.js";

describe("CommandWithConfig", () => {
	// it.skip("", async () => {
	// 	const { stdout } = await runCommand(["configTest"], {
	// 		root: import.meta.url,
	// 	});
	// 	expect(stdout).to.equal("Succeeded.");
	// });

	it("loads default config when config is missing", async () => {
		const { stdout } = await runCommand(["configTest"], {
			root: import.meta.url,
		});
		expect(stdout.trim()).toMatch(/^.*?Loaded config from: DEFAULT/);
	});

	it("fails when config is missing", async () => {
		const { error } = await runCommand(["configTestNoDefault"], {
			root: import.meta.url,
		});
		expect(error?.message).toMatch(/^Failure to load config: .*/);
	});
});
