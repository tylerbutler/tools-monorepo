import path from "pathe";
import type { PackageJson } from "type-fest";
import { describe, expect, it } from "vitest";

import {
	type PackageTransformer,
	type PackageTransformerAsync,
	readJsonWithIndent,
	updatePackageJsonFile,
} from "../src/json.js";
import { testDataPath } from "./common.js";

/**
 * A transformer function that does nothing.
 */
const testTransformer: PackageTransformer = (_: PackageJson): PackageJson => {
	// no transformation
	return _;
};

/**
 * A transformer function that does nothing.
 */
// biome-ignore lint/suspicious/useAwait: <explanation>
// const testTransformerAsync: PackageTransformerAsync = async (
// 	_,
// ): Promise<PackageJson> => {
// 	// no transformation
// 	return _;
// };

describe("json.ts", () => {
	const jsonData = path.join(testDataPath, "json");
	const spaces = path.resolve(jsonData, "spaces/_package.json");
	const tabs = path.resolve(jsonData, "tabs/_package.json");

	describe("readJsonWithIndent", () => {
		it("reads indentation style in file with spaces", async () => {
			const { indent } = await readJsonWithIndent(spaces);
			expect(indent).toMatchInlineSnapshot(`
				{
				  "amount": 2,
				  "indent": "  ",
				  "type": "space",
				}
			`);
		});

		it("reads indentation style in file with tabs", async () => {
			const { indent } = await readJsonWithIndent(tabs);
			expect(indent.indent).toEqual("\t");
			expect(indent).toMatchInlineSnapshot(`
				{
				  "amount": 1,
				  "indent": "	",
				  "type": "tab",
				}
			`);
		});
	});

	describe("updatePackageJsonFile", () => {
		it("keeps indentation style in file with spaces", async () => {
			await updatePackageJsonFile(spaces, testTransformer);
			const { indent } = await readJsonWithIndent(spaces);
			expect(indent.indent).toEqual("  ");
		});

		it("keeps indentation style in file with tabs", async () => {
			await updatePackageJsonFile(tabs, testTransformer);
			const { indent } = await readJsonWithIndent(tabs);
			expect(indent.indent).toEqual("\t");
		});
	});
});
