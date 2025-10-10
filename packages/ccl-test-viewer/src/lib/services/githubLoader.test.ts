import { describe, expect, it } from "vitest";
import { GitHubLoader } from "./githubLoader.js";

describe("GitHubLoader", () => {
	const loader = new GitHubLoader();

	describe("parseGitHubUrl", () => {
		describe("github.com URLs", () => {
			it("parses basic repository URL", () => {
				const result = loader.parseGitHubUrl(
					"https://github.com/owner/repo",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "",
				});
			});

			it("parses repository URL with tree path", () => {
				const result = loader.parseGitHubUrl(
					"https://github.com/owner/repo/tree/develop/tests/data",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "develop",
					path: "tests/data",
				});
			});

			it("parses repository URL with tree but no path", () => {
				const result = loader.parseGitHubUrl(
					"https://github.com/owner/repo/tree/feature-branch",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "feature-branch",
					path: "",
				});
			});

			it("handles main branch explicitly", () => {
				const result = loader.parseGitHubUrl(
					"https://github.com/owner/repo/tree/main",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "",
				});
			});

			it("handles nested paths with multiple segments", () => {
				const result = loader.parseGitHubUrl(
					"https://github.com/owner/repo/tree/main/path/to/nested/data",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "path/to/nested/data",
				});
			});

			it("rejects URL with only owner", () => {
				const result = loader.parseGitHubUrl(
					"https://github.com/owner",
				);
				expect(result).toBeNull();
			});

			it("rejects URL with invalid path", () => {
				const result = loader.parseGitHubUrl("https://github.com/");
				expect(result).toBeNull();
			});
		});

		describe("api.github.com URLs", () => {
			it("parses API URL with default branch", () => {
				const result = loader.parseGitHubUrl(
					"https://api.github.com/repos/owner/repo/contents/data",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "data",
				});
			});

			it("parses API URL with ref parameter", () => {
				const result = loader.parseGitHubUrl(
					"https://api.github.com/repos/owner/repo/contents/data?ref=develop",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "develop",
					path: "data",
				});
			});

			it("parses API URL with nested path", () => {
				const result = loader.parseGitHubUrl(
					"https://api.github.com/repos/owner/repo/contents/path/to/file.json",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "path/to/file.json",
				});
			});

			it("parses API URL without path", () => {
				const result = loader.parseGitHubUrl(
					"https://api.github.com/repos/owner/repo/contents",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "",
				});
			});

			it("rejects API URL with invalid format", () => {
				const result = loader.parseGitHubUrl(
					"https://api.github.com/owner/repo",
				);
				expect(result).toBeNull();
			});

			it("rejects API URL without repos prefix", () => {
				const result = loader.parseGitHubUrl(
					"https://api.github.com/owner/repo/contents/data",
				);
				expect(result).toBeNull();
			});
		});

		describe("raw.githubusercontent.com URLs", () => {
			it("parses raw URL with main branch", () => {
				const result = loader.parseGitHubUrl(
					"https://raw.githubusercontent.com/owner/repo/main/test.json",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "test.json",
				});
			});

			it("parses raw URL with custom branch", () => {
				const result = loader.parseGitHubUrl(
					"https://raw.githubusercontent.com/owner/repo/develop/data/test.json",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "develop",
					path: "data/test.json",
				});
			});

			it("parses raw URL with nested path", () => {
				const result = loader.parseGitHubUrl(
					"https://raw.githubusercontent.com/owner/repo/main/path/to/nested/file.json",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "path/to/nested/file.json",
				});
			});

			it("handles raw URL without file extension", () => {
				const result = loader.parseGitHubUrl(
					"https://raw.githubusercontent.com/owner/repo/main/README",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "README",
				});
			});

			it("rejects raw URL with insufficient path segments", () => {
				const result = loader.parseGitHubUrl(
					"https://raw.githubusercontent.com/owner/repo",
				);
				expect(result).toBeNull();
			});
		});

		describe("invalid URLs", () => {
			it("rejects non-GitHub URLs", () => {
				const result = loader.parseGitHubUrl(
					"https://gitlab.com/owner/repo",
				);
				expect(result).toBeNull();
			});

			it("rejects invalid URL format", () => {
				const result = loader.parseGitHubUrl("not-a-url");
				expect(result).toBeNull();
			});

			it("rejects empty string", () => {
				const result = loader.parseGitHubUrl("");
				expect(result).toBeNull();
			});

			it("rejects URL with unsupported hostname", () => {
				const result = loader.parseGitHubUrl(
					"https://github.io/owner/repo",
				);
				expect(result).toBeNull();
			});
		});

		describe("edge cases", () => {
			it("handles URLs with trailing slashes", () => {
				const result = loader.parseGitHubUrl(
					"https://github.com/owner/repo/",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "",
				});
			});

			it("handles URLs with query parameters", () => {
				const result = loader.parseGitHubUrl(
					"https://github.com/owner/repo?tab=readme",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "",
				});
			});

			it("handles complex repository names", () => {
				const result = loader.parseGitHubUrl(
					"https://github.com/owner-name/repo-name.js",
				);

				expect(result).toEqual({
					owner: "owner-name",
					repo: "repo-name.js",
					branch: "main",
					path: "",
				});
			});

			it("handles branch names with special characters", () => {
				const result = loader.parseGitHubUrl(
					"https://github.com/owner/repo/tree/feature/new-feature",
				);

				expect(result).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "feature",
					path: "new-feature",
				});
			});
		});
	});

	describe("validateGitHubUrl", () => {
		it("validates correct GitHub URL", () => {
			const result = loader.validateGitHubUrl(
				"https://github.com/owner/repo",
			);

			expect(result.valid).toBe(true);
			expect(result.repository).toEqual({
				owner: "owner",
				repo: "repo",
				branch: "main",
				path: "",
			});
			expect(result.error).toBeUndefined();
		});

		it("rejects empty URL", () => {
			const result = loader.validateGitHubUrl("");

			expect(result.valid).toBe(false);
			expect(result.error).toBe("URL cannot be empty");
			expect(result.repository).toBeUndefined();
		});

		it("rejects whitespace-only URL", () => {
			const result = loader.validateGitHubUrl("   ");

			expect(result.valid).toBe(false);
			expect(result.error).toBe("URL cannot be empty");
		});

		it("rejects invalid URL format", () => {
			const result = loader.validateGitHubUrl("not-a-github-url");

			expect(result.valid).toBe(false);
			expect(result.error).toBe("Invalid GitHub URL format");
		});

		it("rejects non-GitHub URL", () => {
			const result = loader.validateGitHubUrl(
				"https://gitlab.com/owner/repo",
			);

			expect(result.valid).toBe(false);
			expect(result.error).toBe("Invalid GitHub URL format");
		});

		it("validates API URLs", () => {
			const result = loader.validateGitHubUrl(
				"https://api.github.com/repos/owner/repo/contents/data",
			);

			expect(result.valid).toBe(true);
			expect(result.repository).toEqual({
				owner: "owner",
				repo: "repo",
				branch: "main",
				path: "data",
			});
		});

		it("validates raw URLs", () => {
			const result = loader.validateGitHubUrl(
				"https://raw.githubusercontent.com/owner/repo/main/test.json",
			);

			expect(result.valid).toBe(true);
			expect(result.repository).toEqual({
				owner: "owner",
				repo: "repo",
				branch: "main",
				path: "test.json",
			});
		});

		it("validates URLs with tree paths", () => {
			const result = loader.validateGitHubUrl(
				"https://github.com/owner/repo/tree/develop/tests",
			);

			expect(result.valid).toBe(true);
			expect(result.repository).toEqual({
				owner: "owner",
				repo: "repo",
				branch: "develop",
				path: "tests",
			});
		});
	});
});
