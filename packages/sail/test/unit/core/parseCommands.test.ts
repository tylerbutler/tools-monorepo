import { describe, expect, it, vi } from "vitest";
import {
	isConcurrentlyCommand,
	parseConcurrentlyCommand,
} from "../../../src/core/parseCommands.js";

describe("parseCommands", () => {
	describe("isConcurrentlyCommand", () => {
		it("should return true for concurrently command", () => {
			const result = isConcurrentlyCommand("concurrently npm:build npm:test");
			expect(result).toBe(true);
		});

		it("should return true for concurrently with single script", () => {
			const result = isConcurrentlyCommand('concurrently "npm:build"');
			expect(result).toBe(true);
		});

		it("should return false for non-concurrently command", () => {
			const result = isConcurrentlyCommand("npm run build");
			expect(result).toBe(false);
		});

		it("should return false for empty string", () => {
			const result = isConcurrentlyCommand("");
			expect(result).toBe(false);
		});

		it("should return false for concurrently without space", () => {
			const result = isConcurrentlyCommand("concurrently");
			expect(result).toBe(false);
		});

		it("should be case sensitive", () => {
			const result = isConcurrentlyCommand("Concurrently npm:build");
			expect(result).toBe(false);
		});
	});

	describe("parseConcurrentlyCommand", () => {
		it("should parse single npm script", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				"concurrently npm:build" as any,
				["build", "test"],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).toHaveBeenCalledWith("build");
			expect(onDirectCommand).not.toHaveBeenCalled();
		});

		it("should parse multiple npm scripts", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				"concurrently npm:build npm:test" as any,
				["build", "test"],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).toHaveBeenCalledWith("build");
			expect(onNpmCommand).toHaveBeenCalledWith("test");
			expect(onDirectCommand).not.toHaveBeenCalled();
		});

		it("should parse quoted npm scripts", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				'concurrently "npm:build" "npm:test"' as any,
				["build", "test"],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).toHaveBeenCalledWith("build");
			expect(onNpmCommand).toHaveBeenCalledWith("test");
		});

		it("should parse direct commands", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				"concurrently tsc webpack" as any,
				[],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onDirectCommand).toHaveBeenCalledWith("tsc");
			expect(onDirectCommand).toHaveBeenCalledWith("webpack");
			expect(onNpmCommand).not.toHaveBeenCalled();
		});

		it("should parse mixed npm and direct commands", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				"concurrently npm:build tsc" as any,
				["build"],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).toHaveBeenCalledWith("build");
			expect(onDirectCommand).toHaveBeenCalledWith("tsc");
		});

		it("should handle wildcard script patterns", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				'concurrently "npm:test*"' as any,
				["test:unit", "test:e2e", "test:integration"],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).toHaveBeenCalledWith("test:unit");
			expect(onNpmCommand).toHaveBeenCalledWith("test:e2e");
			expect(onNpmCommand).toHaveBeenCalledWith("test:integration");
		});

		it("should handle wildcard with prefix match", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				'concurrently "npm:build*"' as any,
				["build:dev", "build:prod", "test:unit"],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).toHaveBeenCalledWith("build:dev");
			expect(onNpmCommand).toHaveBeenCalledWith("build:prod");
			expect(onNpmCommand).not.toHaveBeenCalledWith("test:unit");
		});

		it("should not call onNpmCommand for wildcard with no matches", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				'concurrently "npm:nonexistent*"' as any,
				["build", "test"],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).not.toHaveBeenCalled();
		});

		it("should handle multiple spaces between commands", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				"concurrently   npm:build    npm:test" as any,
				["build", "test"],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).toHaveBeenCalledWith("build");
			expect(onNpmCommand).toHaveBeenCalledWith("test");
		});

		it("should handle unquoted wildcard scripts", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				"concurrently npm:test*" as any,
				["test:unit", "test:e2e"],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).toHaveBeenCalledWith("test:unit");
			expect(onNpmCommand).toHaveBeenCalledWith("test:e2e");
		});

		it("should match scripts with wildcard prefix", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				'concurrently "npm:b*"' as any,
				["build", "bundle", "test", "lint"],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).toHaveBeenCalledWith("build");
			expect(onNpmCommand).toHaveBeenCalledWith("bundle");
			expect(onNpmCommand).not.toHaveBeenCalledWith("test");
			expect(onNpmCommand).not.toHaveBeenCalledWith("lint");
		});

		it("should differentiate between unquoted and quoted npm specs", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				'concurrently npm:build "npm:test"' as any,
				["build", "test"],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).toHaveBeenCalledWith("build");
			expect(onNpmCommand).toHaveBeenCalledWith("test");
		});

		it("should handle complex command line", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				'concurrently npm:build "npm:test*" tsc --watch' as any,
				["build", "test:unit", "test:e2e"],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).toHaveBeenCalledWith("build");
			expect(onNpmCommand).toHaveBeenCalledWith("test:unit");
			expect(onNpmCommand).toHaveBeenCalledWith("test:e2e");
			expect(onDirectCommand).toHaveBeenCalledWith("tsc");
			expect(onDirectCommand).toHaveBeenCalledWith("--watch");
		});

		it("should handle empty script list gracefully", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				"concurrently npm:test*" as any,
				[],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).not.toHaveBeenCalled();
			expect(onDirectCommand).not.toHaveBeenCalled();
		});

		it("should handle scripts with special characters", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				'concurrently "npm:build:prod"' as any,
				["build:prod", "build:dev"],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).toHaveBeenCalledWith("build:prod");
		});

		it("should process all scripts even if some are invalid", () => {
			const onNpmCommand = vi.fn();
			const onDirectCommand = vi.fn();

			parseConcurrentlyCommand(
				"concurrently npm:valid invalid npm:another" as any,
				["valid", "another"],
				onNpmCommand,
				onDirectCommand,
			);

			expect(onNpmCommand).toHaveBeenCalledWith("valid");
			expect(onNpmCommand).toHaveBeenCalledWith("another");
			expect(onDirectCommand).toHaveBeenCalledWith("invalid");
		});
	});
});
