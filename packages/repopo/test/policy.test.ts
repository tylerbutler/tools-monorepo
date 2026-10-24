import { describe, expect, it } from "vitest";
import { PackageJsonRegexMatch } from "../src/policies/constants.js";
import { DefaultPolicies } from "../src/policy.js";

describe("canonical definitions", () => {
	it("keeps the default policy set", () => {
		expect(DefaultPolicies.map((policy) => policy.name)).toEqual([
			"NoJsFileExtensions",
			"PackageJsonRepoDirectoryProperty",
			"PackageJsonSorted",
		]);
	});
	it.each([
		"package.json",
		"a/package.json",
		"a/PACKAGE.JSON",
	])("matches a package manifest filename: %s", (file) => {
		expect(PackageJsonRegexMatch.test(file)).toBe(true);
	});
	it.each([
		"package.json.bak",
		"package.json5",
		"package.json/child",
		"not-package.json",
	])("rejects misleading package paths: %s", (file) => {
		expect(PackageJsonRegexMatch.test(file)).toBe(false);
	});
});
