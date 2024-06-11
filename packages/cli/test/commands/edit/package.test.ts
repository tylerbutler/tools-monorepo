import { copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "@oclif/test";
import { testWithTempDir } from "@tylerbu/cli-api/test";
import { describe, expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = {
	packageJson: "../../data/package.json",
};

describe("edit:package command", () => {
	testWithTempDir("gets a property", async ({ tempDir }) => {
		const sourceFile = path.join(__dirname, testFiles.packageJson);
		const testFile = path.join(tempDir, path.basename(testFiles.packageJson));
		await copyFile(sourceFile, testFile);

		// const { stdout } = await runCommand<EditPackage>(
		const { stdout } = await runCommand<{ name: string }>(
			["edit:package", "private"],
			undefined,
			{ print: true },
		);
		expect(stdout).to.equal("true");
	});
});
