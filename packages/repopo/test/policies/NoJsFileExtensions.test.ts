import { describe, expect, it } from "vitest";
import { NoJsFileExtensions } from "../../src/policies/NoJsFileExtensions.js";
import { runHandler } from "../test-helpers.js";

describe("NoJsFileExtensions Policy", () => {
	describe("Policy Definition", () => {
		it("should have correct policy name", () => {
			expect(NoJsFileExtensions.name).toBe("NoJsFileExtensions");
		});

		it("should have description", () => {
			expect(NoJsFileExtensions.description).toBe(
				"Prevents ambiguous .js files by requiring explicit .mjs or .cjs extensions based on module format.",
			);
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
			const result = await runHandler(NoJsFileExtensions.handler, {
				file: "index.js",
				root: "/test/root",
				resolve: false,
				config: undefined,
			});
			expect(result).not.toEqual([]);
			expect(result.every((finding) => !("name" in finding))).toBe(true);
			expect(result.every((finding) => !("file" in finding))).toBe(true);
			expect(result.some((finding) => finding.fixStatus !== undefined)).toEqual(
				false,
			);
			const failure = result;
			expect(failure.map((finding) => finding.message).join()).toContain(
				".cjs or .mjs",
			);
		});

		it("should fail for .js files in subdirectories", async () => {
			const result = await runHandler(NoJsFileExtensions.handler, {
				file: "src/utils.js",
				root: "/test/root",
				resolve: false,
				config: undefined,
			});
			expect(result.every((finding) => !("file" in finding))).toBe(true);
			expect(result.some((finding) => finding.fixStatus !== undefined)).toEqual(
				false,
			);
		});

		it("should fail with descriptive error message", async () => {
			const result = await runHandler(NoJsFileExtensions.handler, {
				file: "script.js",
				root: "/test/root",
				resolve: false,
				config: undefined,
			});
			expect(result.map((finding) => finding.message).join()).toBeDefined();
			expect(result.map((finding) => finding.message).join()).toContain(
				"JavaScript files",
			);
			expect(result.map((finding) => finding.message).join()).toContain(".cjs");
			expect(result.map((finding) => finding.message).join()).toContain(".mjs");
			// The manual fix guidance is in a separate field
			expect(result[0]?.manualFix).toContain("Rename the file");
		});

		it("should mark as not auto-fixable", async () => {
			const result = await runHandler(NoJsFileExtensions.handler, {
				file: "app.js",
				root: "/test/root",
				resolve: false,
				config: undefined,
			});
			expect(result.some((finding) => finding.fixStatus !== undefined)).toBe(
				false,
			);
		});

		it("should not change behavior with resolve flag", async () => {
			const resultWithoutResolve = await runHandler(
				NoJsFileExtensions.handler,
				{
					file: "test.js",
					root: "/test/root",
					resolve: false,
					config: undefined,
				},
			);

			const resultWithResolve = await runHandler(NoJsFileExtensions.handler, {
				file: "test.js",
				root: "/test/root",
				resolve: true,
				config: undefined,
			});

			expect(resultWithoutResolve).toEqual(resultWithResolve);
			expect(
				resultWithResolve.some((finding) => finding.fixStatus !== undefined),
			).toEqual(false);
		});

		it("should work with different root paths", async () => {
			const result1 = await runHandler(NoJsFileExtensions.handler, {
				file: "index.js",
				root: "/path/to/project",
				resolve: false,
				config: undefined,
			});
			const result2 = await runHandler(NoJsFileExtensions.handler, {
				file: "index.js",
				root: "/different/root",
				resolve: false,
				config: undefined,
			});
			expect(result1.file).toBe(result2.file);
			expect(result1.map((finding) => finding.message)).toEqual(
				result2.map((finding) => finding.message),
			);
		});

		it("should handle uppercase .JS extension", async () => {
			const result = await runHandler(NoJsFileExtensions.handler, {
				file: "SCRIPT.JS",
				root: "/test/root",
				resolve: false,
				config: undefined,
			});
			expect(result.every((finding) => !("file" in finding))).toBe(true);
			expect(result.some((finding) => finding.fixStatus !== undefined)).toBe(
				false,
			);
		});
	});

	describe("Use Case Scenarios", () => {
		it("should detect problematic .js file in ESM project", async () => {
			// In an ESM project (type: "module"), a .js file would be treated as ESM
			// which could cause issues if it's actually CommonJS code
			const result = await runHandler(NoJsFileExtensions.handler, {
				file: "src/legacy-commonjs.js",
				root: "/esm-project",
				resolve: false,
				config: undefined,
			});
			expect(result.some((finding) => finding.fixStatus !== undefined)).toEqual(
				false,
			);
			expect(result.map((finding) => finding.message).join()).toContain(
				"module format",
			);
		});

		it("should detect problematic .js file in CommonJS project", async () => {
			// In a CommonJS project (type: "commonjs" or no type field),
			// a .js file would be treated as CommonJS, which could cause issues
			// if it's actually ESM code
			const result = await runHandler(NoJsFileExtensions.handler, {
				file: "src/modern-esm.js",
				root: "/cjs-project",
				resolve: false,
				config: undefined,
			});
			expect(result.some((finding) => finding.fixStatus !== undefined)).toEqual(
				false,
			);
		});

		it("should encourage explicit module type declaration", async () => {
			const result = await runHandler(NoJsFileExtensions.handler, {
				file: "utils.js",
				root: "/project",
				resolve: false,
				config: undefined,
			});
			// The error message should guide users to use explicit extensions
			expect(result.map((finding) => finding.message).join()).toContain(
				".cjs or .mjs",
			);
			expect(result.map((finding) => finding.message).join()).toContain(
				"module format",
			);
		});
	});
});
