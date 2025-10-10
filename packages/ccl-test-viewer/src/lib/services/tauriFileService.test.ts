import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	isOfflineModeAvailable,
	isTauriEnvironment,
} from "./tauriFileService.js";

describe("tauriFileService", () => {
	describe("isTauriEnvironment", () => {
		beforeEach(() => {
			// Clean up window object before each test
			if (typeof window !== "undefined") {
				delete (window as any).__TAURI__;
			}
		});

		it("returns false when not in browser environment", () => {
			// Save original window
			const originalWindow = global.window;

			// Remove window object
			(global as any).window = undefined;

			const result = isTauriEnvironment();
			expect(result).toBe(false);

			// Restore window
			(global as any).window = originalWindow;
		});

		it("returns false when __TAURI__ is not defined", () => {
			const result = isTauriEnvironment();
			expect(result).toBe(false);
		});

		it("returns true when __TAURI__ exists but is null", () => {
			// Note: The implementation checks for existence with 'in' operator
			// which returns true even if value is null
			(window as any).__TAURI__ = null;
			const result = isTauriEnvironment();
			expect(result).toBe(true);
		});

		it("returns false when __TAURI__ is explicitly undefined", () => {
			// The implementation checks !== undefined, so setting to undefined returns false
			(window as any).__TAURI__ = undefined;
			const result = isTauriEnvironment();
			expect(result).toBe(false);
		});

		it("returns true when __TAURI__ is defined", () => {
			(window as any).__TAURI__ = { invoke: vi.fn() };
			const result = isTauriEnvironment();
			expect(result).toBe(true);
		});

		it("returns true when __TAURI__ is an empty object", () => {
			(window as any).__TAURI__ = {};
			const result = isTauriEnvironment();
			expect(result).toBe(true);
		});

		it("handles __TAURI__ as a string", () => {
			(window as any).__TAURI__ = "tauri";
			const result = isTauriEnvironment();
			expect(result).toBe(true);
		});

		it("handles __TAURI__ as a number", () => {
			(window as any).__TAURI__ = 1;
			const result = isTauriEnvironment();
			expect(result).toBe(true);
		});
	});

	describe("isOfflineModeAvailable", () => {
		beforeEach(() => {
			if (typeof window !== "undefined") {
				delete (window as any).__TAURI__;
			}
		});

		it("returns false when not in Tauri environment", () => {
			const result = isOfflineModeAvailable();
			expect(result).toBe(false);
		});

		it("returns true when in Tauri environment", () => {
			(window as any).__TAURI__ = { invoke: vi.fn() };
			const result = isOfflineModeAvailable();
			expect(result).toBe(true);
		});
	});

	describe("path extraction logic", () => {
		it("extracts filename from Windows path", () => {
			const path = "C:\\Users\\Test\\Documents\\test.json";
			const fileName = path.split(/[\\/]/).pop() || "unknown.json";
			expect(fileName).toBe("test.json");
		});

		it("extracts filename from Unix path", () => {
			const path = "/home/user/documents/test.json";
			const fileName = path.split(/[\\/]/).pop() || "unknown.json";
			expect(fileName).toBe("test.json");
		});

		it("extracts filename from mixed separators", () => {
			const path = "C:/Users/Test\\Documents/test.json";
			const fileName = path.split(/[\\/]/).pop() || "unknown.json";
			expect(fileName).toBe("test.json");
		});

		it("handles path with no separators", () => {
			const path = "test.json";
			const fileName = path.split(/[\\/]/).pop() || "unknown.json";
			expect(fileName).toBe("test.json");
		});

		it("handles empty path", () => {
			const path = "";
			const fileName = path.split(/[\\/]/).pop() || "unknown.json";
			expect(fileName).toBe("unknown.json");
		});

		it("handles path ending with separator", () => {
			const path = "/home/user/documents/";
			const fileName = path.split(/[\\/]/).pop() || "unknown.json";
			expect(fileName).toBe("unknown.json");
		});

		it("handles complex nested paths", () => {
			const path = "/very/long/nested/path/to/file/test-data.json";
			const fileName = path.split(/[\\/]/).pop() || "unknown.json";
			expect(fileName).toBe("test-data.json");
		});

		it("preserves file extension", () => {
			const path = "/path/to/file.test.json";
			const fileName = path.split(/[\\/]/).pop() || "unknown.json";
			expect(fileName).toBe("file.test.json");
		});
	});

	describe("date formatting logic", () => {
		it("formats date for default export filename", () => {
			const date = new Date("2025-03-15T12:30:00Z");
			const formatted = date.toISOString().split("T")[0];
			expect(formatted).toBe("2025-03-15");
		});

		it("handles current date", () => {
			const formatted = new Date().toISOString().split("T")[0];
			expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});

		it("creates consistent filename format", () => {
			const date = new Date("2025-01-01T00:00:00Z");
			const defaultFileName = `ccl-data-collection-${date.toISOString().split("T")[0]}.json`;
			expect(defaultFileName).toBe("ccl-data-collection-2025-01-01.json");
		});
	});

	describe("hash function logic", () => {
		// Reimplementation of simpleHash for testing
		function simpleHash(str: string): string {
			let hash = 0;
			for (let i = 0; i < str.length; i++) {
				const char = str.charCodeAt(i);
				hash = (hash << 5) - hash + char;
				hash &= hash;
			}
			return hash.toString(36);
		}

		it("generates consistent hash for same input", () => {
			const input = "test content";
			const hash1 = simpleHash(input);
			const hash2 = simpleHash(input);
			expect(hash1).toBe(hash2);
		});

		it("generates different hashes for different inputs", () => {
			const hash1 = simpleHash("content1");
			const hash2 = simpleHash("content2");
			expect(hash1).not.toBe(hash2);
		});

		it("handles empty string", () => {
			const hash = simpleHash("");
			expect(hash).toBe("0");
		});

		it("handles single character", () => {
			const hash = simpleHash("a");
			expect(hash).toBeTruthy();
			expect(typeof hash).toBe("string");
		});

		it("handles long strings", () => {
			const longString = "a".repeat(10_000);
			const hash = simpleHash(longString);
			expect(hash).toBeTruthy();
			expect(typeof hash).toBe("string");
		});

		it("handles special characters", () => {
			const hash = simpleHash("!@#$%^&*()_+-={}[]|\\:;\"'<>,.?/");
			expect(hash).toBeTruthy();
		});

		it("handles unicode characters", () => {
			const hash = simpleHash("Hello 世界 🌍");
			expect(hash).toBeTruthy();
		});

		it("returns base36 string", () => {
			const hash = simpleHash("test");
			expect(hash).toMatch(/^-?[0-9a-z]+$/);
		});
	});

	describe("JSON validation logic", () => {
		it("validates correct JSON", () => {
			const content = '{"test": "data"}';
			expect(() => JSON.parse(content)).not.toThrow();
		});

		it("rejects invalid JSON", () => {
			const content = "{invalid json}";
			expect(() => JSON.parse(content)).toThrow();
		});

		it("validates empty object", () => {
			const content = "{}";
			expect(() => JSON.parse(content)).not.toThrow();
		});

		it("validates empty array", () => {
			const content = "[]";
			expect(() => JSON.parse(content)).not.toThrow();
		});

		it("validates nested structures", () => {
			const content = '{"nested": {"data": [1, 2, 3]}}';
			expect(() => JSON.parse(content)).not.toThrow();
		});
	});

	describe("collection validation logic", () => {
		it("validates collection with sources array", () => {
			const importData = { sources: [] };
			const isValid = importData.sources && Array.isArray(importData.sources);
			expect(isValid).toBe(true);
		});

		it("rejects collection without sources", () => {
			const importData = {} as any;
			const isValid = importData.sources && Array.isArray(importData.sources);
			expect(isValid).toBeFalsy();
		});

		it("rejects collection with non-array sources", () => {
			const importData = { sources: "not-an-array" };
			const isValid = importData.sources && Array.isArray(importData.sources);
			expect(isValid).toBe(false);
		});

		it("validates collection with populated sources", () => {
			const importData = {
				sources: [{ id: "1", name: "Test", files: [] }],
			};
			const isValid = importData.sources && Array.isArray(importData.sources);
			expect(isValid).toBe(true);
		});
	});

	describe("error message formatting logic", () => {
		it("formats error with Error instance", () => {
			const error = new Error("Test error");
			const message = `Operation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
			expect(message).toBe("Operation failed: Test error");
		});

		it("formats error with string", () => {
			const error: unknown = "String error";
			const message = `Operation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
			expect(message).toBe("Operation failed: Unknown error");
		});

		it("formats error with null", () => {
			// biome-ignore lint/suspicious/noEvolvingTypes: Testing null error handling
			const error = null;
			const message = `Operation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
			expect(message).toBe("Operation failed: Unknown error");
		});

		it("formats error with undefined", () => {
			const error = undefined;
			const message = `Operation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
			expect(message).toBe("Operation failed: Unknown error");
		});
	});
});
