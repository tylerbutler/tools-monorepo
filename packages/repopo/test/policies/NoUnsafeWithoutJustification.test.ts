import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NoUnsafeWithoutJustification } from "../../src/policies/NoUnsafeWithoutJustification.js";
import { runHandler } from "../test-helpers.js";

describe("NoUnsafeWithoutJustification", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = join(
			tmpdir(),
			`repopo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		);
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("policy matching", () => {
		it("should match .rs files", () => {
			expect(NoUnsafeWithoutJustification.match.test("src/main.rs")).toBe(true);
			expect(NoUnsafeWithoutJustification.match.test("lib.rs")).toBe(true);
		});

		it("should not match non-Rust files", () => {
			expect(NoUnsafeWithoutJustification.match.test("src/main.ts")).toBe(
				false,
			);
			expect(NoUnsafeWithoutJustification.match.test("Cargo.toml")).toBe(false);
		});
	});

	describe("pass cases", () => {
		it("should pass when unsafe block has SAFETY comment", async () => {
			mkdirSync(join(testDir, "src"), { recursive: true });
			writeFileSync(
				join(testDir, "src/main.rs"),
				[
					"fn main() {",
					"    // SAFETY: This pointer is guaranteed to be valid",
					"    unsafe {",
					"        std::ptr::null::<u8>();",
					"    }",
					"}",
				].join("\n"),
			);

			const result = await runHandler(NoUnsafeWithoutJustification.handler, {
				file: "src/main.rs",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass when unsafe fn has SAFETY comment", async () => {
			mkdirSync(join(testDir, "src"), { recursive: true });
			writeFileSync(
				join(testDir, "src/lib.rs"),
				[
					"// SAFETY: Caller must ensure pointer is valid",
					"unsafe fn do_something() {",
					"    // noop",
					"}",
				].join("\n"),
			);

			const result = await runHandler(NoUnsafeWithoutJustification.handler, {
				file: "src/lib.rs",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass when no unsafe code is present", async () => {
			mkdirSync(join(testDir, "src"), { recursive: true });
			writeFileSync(
				join(testDir, "src/lib.rs"),
				["fn safe_function() {", '    println!("hello");', "}"].join("\n"),
			);

			const result = await runHandler(NoUnsafeWithoutJustification.handler, {
				file: "src/lib.rs",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when unsafe block has no SAFETY comment", async () => {
			mkdirSync(join(testDir, "src"), { recursive: true });
			writeFileSync(
				join(testDir, "src/main.rs"),
				[
					"fn main() {",
					"    unsafe {",
					"        std::ptr::null::<u8>();",
					"    }",
					"}",
				].join("\n"),
			);

			const result = await runHandler(NoUnsafeWithoutJustification.handler, {
				file: "src/main.rs",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("unsafe block without");
				expect(result.error).toContain("Line 2");
			}
		});

		it("should fail when unsafe impl has no SAFETY comment", async () => {
			mkdirSync(join(testDir, "src"), { recursive: true });
			writeFileSync(
				join(testDir, "src/lib.rs"),
				["struct Foo;", "unsafe impl Send for Foo {}"].join("\n"),
			);

			const result = await runHandler(NoUnsafeWithoutJustification.handler, {
				file: "src/lib.rs",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("unsafe block without");
			}
		});
	});

	describe("excludePaths config", () => {
		it("should skip files matching excludePaths", async () => {
			mkdirSync(join(testDir, "src/generated"), { recursive: true });
			writeFileSync(
				join(testDir, "src/generated/bindings.rs"),
				[
					"// Auto-generated, unsafe is expected",
					"unsafe fn binding_call() {}",
				].join("\n"),
			);

			const result = await runHandler(NoUnsafeWithoutJustification.handler, {
				file: "src/generated/bindings.rs",
				root: testDir,
				resolve: false,
				config: { excludePaths: ["generated/"] },
			});

			expect(result).toBe(true);
		});
	});

	describe("custom requireComment", () => {
		it("should accept a custom comment prefix", async () => {
			mkdirSync(join(testDir, "src"), { recursive: true });
			writeFileSync(
				join(testDir, "src/main.rs"),
				[
					"fn main() {",
					"    // JUSTIFICATION: This is safe because...",
					"    unsafe {",
					"        std::ptr::null::<u8>();",
					"    }",
					"}",
				].join("\n"),
			);

			const result = await runHandler(NoUnsafeWithoutJustification.handler, {
				file: "src/main.rs",
				root: testDir,
				resolve: false,
				config: { requireComment: "// JUSTIFICATION:" },
			});

			expect(result).toBe(true);
		});
	});
});
