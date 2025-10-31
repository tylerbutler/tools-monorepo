import { describe, expect, it } from "vitest";

// Simple const object for testing - mirrors the one in buildGraph.ts
const BuildResult = {
	Success: "Success",
	UpToDate: "UpToDate",
	Failed: "Failed",
} as const;

type BuildResult = (typeof BuildResult)[keyof typeof BuildResult];

function summarizeBuildResult(results: BuildResult[]) {
	let retResult = BuildResult.UpToDate;
	for (const result of results) {
		if (result === BuildResult.Failed) {
			return BuildResult.Failed;
		}

		if (result === BuildResult.Success) {
			retResult = BuildResult.Success;
		}
	}
	return retResult;
}

function isKnownMainExecutable(script: string): boolean {
	const knownMainExecutableNames = new Set([
		"sail build",
		"sail b",
		"fluid-build",
	]);

	return [...knownMainExecutableNames].some((name) =>
		script.startsWith(`${name} `),
	);
}

describe("BuildResult utilities", () => {
	describe("summarizeBuildResult", () => {
		it("should return Failed if any result is Failed", () => {
			const results = [
				BuildResult.Success,
				BuildResult.Failed,
				BuildResult.UpToDate,
			];
			expect(summarizeBuildResult(results)).toBe(BuildResult.Failed);
		});

		it("should return Success if no failures and at least one success", () => {
			const results = [
				BuildResult.Success,
				BuildResult.UpToDate,
				BuildResult.Success,
			];
			expect(summarizeBuildResult(results)).toBe(BuildResult.Success);
		});

		it("should return UpToDate if all results are UpToDate", () => {
			const results = [BuildResult.UpToDate, BuildResult.UpToDate];
			expect(summarizeBuildResult(results)).toBe(BuildResult.UpToDate);
		});

		it("should return UpToDate for empty array", () => {
			expect(summarizeBuildResult([])).toBe(BuildResult.UpToDate);
		});

		it("should handle single Failed result", () => {
			expect(summarizeBuildResult([BuildResult.Failed])).toBe(
				BuildResult.Failed,
			);
		});

		it("should handle single Success result", () => {
			expect(summarizeBuildResult([BuildResult.Success])).toBe(
				BuildResult.Success,
			);
		});

		it("should handle single UpToDate result", () => {
			expect(summarizeBuildResult([BuildResult.UpToDate])).toBe(
				BuildResult.UpToDate,
			);
		});
	});

	describe("isKnownMainExecutable", () => {
		it("should return true for known main executables", () => {
			expect(isKnownMainExecutable("sail build packages")).toBe(true);
			expect(isKnownMainExecutable("sail b packages")).toBe(true);
			expect(isKnownMainExecutable("fluid-build packages")).toBe(true);
		});

		it("should return false for unknown executables", () => {
			expect(isKnownMainExecutable("npm run build")).toBe(false);
			expect(isKnownMainExecutable("tsc")).toBe(false);
			expect(isKnownMainExecutable("custom-command")).toBe(false);
		});

		it("should return false for empty string", () => {
			expect(isKnownMainExecutable("")).toBe(false);
		});

		it("should return false for partial matches", () => {
			expect(isKnownMainExecutable("sail")).toBe(false);
			expect(isKnownMainExecutable("build")).toBe(false);
			expect(isKnownMainExecutable("fluid")).toBe(false);
		});

		it("should handle case sensitivity", () => {
			expect(isKnownMainExecutable("SAIL BUILD packages")).toBe(false);
			expect(isKnownMainExecutable("Sail Build packages")).toBe(false);
		});
	});
});
