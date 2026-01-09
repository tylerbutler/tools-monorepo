import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	DEFAULT_INDENTATION,
	detectIndentation,
	detectIndentationFromContent,
} from "../../src/utils/indentation.js";

describe("indentation utilities", () => {
	describe("detectIndentationFromContent", () => {
		describe("tab indentation", () => {
			it("should detect tabs", () => {
				const content = '{\n\t"name": "test"\n}';
				expect(detectIndentationFromContent(content)).toBe("\t");
			});

			it("should detect tabs with multiple levels", () => {
				const content = '{\n\t"nested": {\n\t\t"deep": true\n\t}\n}';
				expect(detectIndentationFromContent(content)).toBe("\t");
			});
		});

		describe("space indentation", () => {
			it("should detect 2-space indentation", () => {
				const content = '{\n  "name": "test"\n}';
				expect(detectIndentationFromContent(content)).toBe(2);
			});

			it("should detect 4-space indentation", () => {
				const content = '{\n    "name": "test"\n}';
				expect(detectIndentationFromContent(content)).toBe(4);
			});

			it("should detect single space indentation", () => {
				const content = '{\n "name": "test"\n}';
				expect(detectIndentationFromContent(content)).toBe(1);
			});
		});

		describe("default behavior", () => {
			it("should return tab as default when no indentation found", () => {
				const content = '{"name": "test"}';
				expect(detectIndentationFromContent(content)).toBe("\t");
			});

			it("should return custom default when provided", () => {
				const content = '{"name": "test"}';
				expect(detectIndentationFromContent(content, 2)).toBe(2);
			});

			it("should handle empty string", () => {
				expect(detectIndentationFromContent("")).toBe("\t");
			});

			it("should handle single line without indentation", () => {
				expect(detectIndentationFromContent("no indent")).toBe("\t");
			});
		});

		describe("edge cases", () => {
			it("should detect from first indented line", () => {
				const content = 'first line\nsecond line\n  indented\n    more';
				expect(detectIndentationFromContent(content)).toBe(2);
			});

			it("should handle mixed content before indentation", () => {
				const content = '{\n// comment\n  "name": "test"\n}';
				expect(detectIndentationFromContent(content)).toBe(2);
			});

			it("should handle CRLF line endings", () => {
				const content = '{\r\n  "name": "test"\r\n}';
				expect(detectIndentationFromContent(content)).toBe(2);
			});

			it("should handle lines with only whitespace", () => {
				// A line with only spaces should be detected
				const content = '{\n  \n  "name": "test"\n}';
				expect(detectIndentationFromContent(content)).toBe(2);
			});
		});

		describe("YAML-like content", () => {
			it("should detect spaces in YAML", () => {
				const content = "root:\n  child: value\n  other: data";
				expect(detectIndentationFromContent(content)).toBe(2);
			});

			it("should detect tabs in YAML", () => {
				const content = "root:\n\tchild: value\n\tother: data";
				expect(detectIndentationFromContent(content)).toBe("\t");
			});
		});
	});

	describe("detectIndentation", () => {
		let tempDir: string;

		beforeEach(() => {
			tempDir = mkdtempSync(join(tmpdir(), "repopo-indent-test-"));
		});

		afterEach(() => {
			rmSync(tempDir, { recursive: true, force: true });
		});

		it("should detect tab indentation from file", async () => {
			const filePath = join(tempDir, "test.json");
			writeFileSync(filePath, '{\n\t"name": "test"\n}');

			const result = await detectIndentation(filePath);
			expect(result).toBe("\t");
		});

		it("should detect space indentation from file", async () => {
			const filePath = join(tempDir, "test.json");
			writeFileSync(filePath, '{\n  "name": "test"\n}');

			const result = await detectIndentation(filePath);
			expect(result).toBe(2);
		});

		it("should return default when file does not exist", async () => {
			const result = await detectIndentation(
				join(tempDir, "nonexistent.json"),
			);
			expect(result).toBe("\t");
		});

		it("should return custom default when file does not exist", async () => {
			const result = await detectIndentation(
				join(tempDir, "nonexistent.json"),
				4,
			);
			expect(result).toBe(4);
		});
	});

	describe("DEFAULT_INDENTATION", () => {
		it("should be tab", () => {
			expect(DEFAULT_INDENTATION).toBe("\t");
		});
	});
});
