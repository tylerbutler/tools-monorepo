import { run } from "effection";
import { describe, expect, it } from "vitest";
import { NoJsFileExtensions } from "../../src/policies/NoJsFileExtensions.js";
import type { PolicyFailure } from "../../src/policy.js";

describe("NoJsFileExtensions Policy", () => {
	describe("Policy Definition", () => {
		it("should have correct policy name", () => {
			expect(NoJsFileExtensions.name).toBe("NoJsFileExtensions");
		});

		it("should have description", () => {
			expect(NoJsFileExtensions.description).toBeUndefined();
		});

		it("should have handler function", () => {
			expect(NoJsFileExtensions.handler).toBeDefined();
			expect(typeof NoJsFileExtensions.handler).toBe("function");
		});

		it("should not have resolver (not auto-fixable)", () => {
			expect(NoJsFileExtensions.resolver).toBeUndefined();
		});
	});

	describe("File Matching", () => {
		it("should match .js files", () => {
			expect("index.js").toMatch(NoJsFileExtensions.match);
			expect("test.js").toMatch(NoJsFileExtensions.match);
			expect("utils.js").toMatch(NoJsFileExtensions.match);
		});

		it("should match .js files in subdirectories", () => {
			expect("src/index.js").toMatch(NoJsFileExtensions.match);
			expect("lib/utils.js").toMatch(NoJsFileExtensions.match);
			expect("packages/foo/bar.js").toMatch(NoJsFileExtensions.match);
		});

		it("should match .js files with any casing", () => {
			expect("FILE.JS").toMatch(NoJsFileExtensions.match);
			expect("Test.Js").toMatch(NoJsFileExtensions.match);
			expect("script.JS").toMatch(NoJsFileExtensions.match);
		});

		it("should not match .mjs files", () => {
			expect("index.mjs").not.toMatch(NoJsFileExtensions.match);
			expect("src/utils.mjs").not.toMatch(NoJsFileExtensions.match);
		});

		it("should not match .cjs files", () => {
			expect("index.cjs").not.toMatch(NoJsFileExtensions.match);
			expect("src/config.cjs").not.toMatch(NoJsFileExtensions.match);
		});

		it("should not match .ts files", () => {
			expect("index.ts").not.toMatch(NoJsFileExtensions.match);
			expect("src/types.ts").not.toMatch(NoJsFileExtensions.match);
		});

		it("should not match .jsx files", () => {
			expect("Component.jsx").not.toMatch(NoJsFileExtensions.match);
		});

		it("should not match .json files", () => {
			expect("package.json").not.toMatch(NoJsFileExtensions.match);
			expect("tsconfig.json").not.toMatch(NoJsFileExtensions.match);
		});

		it("should not match files without extensions", () => {
			expect("README").not.toMatch(NoJsFileExtensions.match);
			expect("LICENSE").not.toMatch(NoJsFileExtensions.match);
		});

		it("should not match .js in the middle of filename", () => {
			expect("test.js.map").not.toMatch(NoJsFileExtensions.match);
		});
	});

	describe("Handler Behavior", () => {
		it("should fail for .js files", async () => {
			const result = await run(() =>
				NoJsFileExtensions.handler({
					file: "index.js",
					root: "/test/root",
					resolve: false,
					config: undefined,
				}),
			);

			expect(result).not.toBe(true);
			expect(result).toHaveProperty("name", "NoJsFileExtensions");
			expect(result).toHaveProperty("file", "index.js");
			expect(result).toHaveProperty("autoFixable", false);

			const failure = result as PolicyFailure;
			expect(failure.errorMessage).toContain(".cjs or .mjs");
		});

		it("should fail for .js files in subdirectories", async () => {
			const result = await run(() =>
				NoJsFileExtensions.handler({
					file: "src/utils.js",
					root: "/test/root",
					resolve: false,
					config: undefined,
				}),
			);

			expect(result).toHaveProperty("file", "src/utils.js");
			expect(result).toHaveProperty("autoFixable", false);
		});

		it("should fail with descriptive error message", async () => {
			const result = await run(() =>
				NoJsFileExtensions.handler({
					file: "script.js",
					root: "/test/root",
					resolve: false,
					config: undefined,
				}),
			) as PolicyFailure;

			expect(result.errorMessage).toBeDefined();
			expect(result.errorMessage).toContain("JavaScript files");
			expect(result.errorMessage).toContain(".cjs");
			expect(result.errorMessage).toContain(".mjs");
			expect(result.errorMessage).toContain("Rename the file");
		});

		it("should mark as not auto-fixable", async () => {
			const result = await run(() =>
				NoJsFileExtensions.handler({
					file: "app.js",
					root: "/test/root",
					resolve: false,
					config: undefined,
				}),
			) as PolicyFailure;

			expect(result.autoFixable).toBe(false);
		});

		it("should not change behavior with resolve flag", async () => {
			const resultWithoutResolve = await run(() =>
				NoJsFileExtensions.handler({
					file: "test.js",
					root: "/test/root",
					resolve: false,
					config: undefined,
				}),
			);

			const resultWithResolve = await run(() =>
				NoJsFileExtensions.handler({
					file: "test.js",
					root: "/test/root",
					resolve: true,
					config: undefined,
				}),
			);

			expect(resultWithoutResolve).toEqual(resultWithResolve);
			expect(resultWithResolve).toHaveProperty("autoFixable", false);
		});

		it("should work with different root paths", async () => {
			const result1 = await run(() =>
				NoJsFileExtensions.handler({
					file: "index.js",
					root: "/path/to/project",
					resolve: false,
					config: undefined,
				}),
			) as PolicyFailure;

			const result2 = await run(() =>
				NoJsFileExtensions.handler({
					file: "index.js",
					root: "/different/root",
					resolve: false,
					config: undefined,
				}),
			) as PolicyFailure;

			expect(result1.file).toBe(result2.file);
			expect(result1.errorMessage).toBe(result2.errorMessage);
		});

		it("should handle uppercase .JS extension", async () => {
			const result = await run(() =>
				NoJsFileExtensions.handler({
					file: "SCRIPT.JS",
					root: "/test/root",
					resolve: false,
					config: undefined,
				}),
			) as PolicyFailure;

			expect(result.file).toBe("SCRIPT.JS");
			expect(result.autoFixable).toBe(false);
		});
	});

	describe("Use Case Scenarios", () => {
		it("should detect problematic .js file in ESM project", async () => {
			// In an ESM project (type: "module"), a .js file would be treated as ESM
			// which could cause issues if it's actually CommonJS code
			const result = await run(() =>
				NoJsFileExtensions.handler({
					file: "src/legacy-commonjs.js",
					root: "/esm-project",
					resolve: false,
					config: undefined,
				}),
			) as PolicyFailure;

			expect(result).toHaveProperty("autoFixable", false);
			expect(result.errorMessage).toContain("module format");
		});

		it("should detect problematic .js file in CommonJS project", async () => {
			// In a CommonJS project (type: "commonjs" or no type field),
			// a .js file would be treated as CommonJS, which could cause issues
			// if it's actually ESM code
			const result = await run(() =>
				NoJsFileExtensions.handler({
					file: "src/modern-esm.js",
					root: "/cjs-project",
					resolve: false,
					config: undefined,
				}),
			) as PolicyFailure;

			expect(result).toHaveProperty("autoFixable", false);
		});

		it("should encourage explicit module type declaration", async () => {
			const result = await run(() =>
				NoJsFileExtensions.handler({
					file: "utils.js",
					root: "/project",
					resolve: false,
					config: undefined,
				}),
			) as PolicyFailure;

			// The error message should guide users to use explicit extensions
			expect(result.errorMessage).toContain(".cjs or .mjs");
			expect(result.errorMessage).toContain("module format");
		});
	});
});
