import { describe, expect, it } from "vitest";
import { type GitHubFileInfo, GitHubLoader } from "./githubLoader.js";

describe("GitHubLoader", () => {
	const loader = new GitHubLoader();

	describe("parseGitHubUrl", () => {
		describe("github.com URLs", () => {
			it("parses basic repository URL", () => {
				const result = loader.parseGitHubUrl("https://github.com/owner/repo");

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
				const result = loader.parseGitHubUrl("https://github.com/owner");
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
				const result = loader.parseGitHubUrl("https://gitlab.com/owner/repo");
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
				const result = loader.parseGitHubUrl("https://github.io/owner/repo");
				expect(result).toBeNull();
			});
		});

		describe("edge cases", () => {
			it("handles URLs with trailing slashes", () => {
				const result = loader.parseGitHubUrl("https://github.com/owner/repo/");

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
			const result = loader.validateGitHubUrl("https://github.com/owner/repo");

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
			const result = loader.validateGitHubUrl("https://gitlab.com/owner/repo");

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

	describe("API Methods with MSW", () => {
		describe("loadRepository", () => {
			it("loads repository contents successfully", async () => {
				const result = await loader.loadRepository({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "tests",
				});

				expect(result.files).toHaveLength(2);
				expect(result.files[0].name).toBe("test.json");
				expect(result.files[1].name).toBe("test2.json");
				expect(result.repository).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "tests",
				});
				expect(result.loadedAt).toBeInstanceOf(Date);
			});

			it("filters for JSON files only", async () => {
				const result = await loader.loadRepository({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "tests",
				});

				expect(result.files).toHaveLength(2);
				expect(result.files.every((f) => f.name.endsWith(".json"))).toBe(true);
			});

			it("throws GitHubAPIError on 404", async () => {
				await expect(
					loader.loadRepository({
						owner: "notfound",
						repo: "repo",
						branch: "main",
					}),
				).rejects.toThrow("Repository, branch, or path not found");
			});

			it("throws GitHubAPIError on 403", async () => {
				await expect(
					loader.loadRepository({
						owner: "private",
						repo: "repo",
						branch: "main",
					}),
				).rejects.toThrow("Rate limit exceeded or repository is private");
			});

			it("uses default branch when not specified", async () => {
				const result = await loader.loadRepository({
					owner: "owner",
					repo: "repo",
				});

				// When branch is not provided, it defaults to undefined in the result
				// but the API request uses "main" as the default
				expect(result.files).toHaveLength(2);
			});

			it("uses custom branch when specified", async () => {
				const result = await loader.loadRepository({
					owner: "owner",
					repo: "repo",
					branch: "develop",
				});

				expect(result.repository.branch).toBe("develop");
			});
		});

		describe("downloadJsonFiles", () => {
			it("downloads and parses JSON files", async () => {
				const files: GitHubFileInfo[] = [
					{
						name: "test.json",
						path: "tests/test.json",
						type: "file",
						size: 1234,
						download_url:
							"https://raw.githubusercontent.com/owner/repo/main/tests/test.json",
						sha: "abc123",
					},
				];

				const result = await loader.downloadJsonFiles(files);

				expect(result).toHaveLength(1);
				expect(result[0].name).toBe("test.json");
				expect(result[0].content).toHaveProperty("$schema");
				expect(result[0].content).toHaveProperty("tests");
				expect(result[0].url).toBe(
					"https://raw.githubusercontent.com/owner/repo/main/tests/test.json",
				);
			});

			it("handles multiple files", async () => {
				const files: GitHubFileInfo[] = [
					{
						name: "test1.json",
						path: "tests/test1.json",
						type: "file",
						size: 1234,
						download_url:
							"https://raw.githubusercontent.com/owner/repo/main/tests/test1.json",
						sha: "abc123",
					},
					{
						name: "test2.json",
						path: "tests/test2.json",
						type: "file",
						size: 2345,
						download_url:
							"https://raw.githubusercontent.com/owner/repo/main/tests/test2.json",
						sha: "def456",
					},
				];

				const result = await loader.downloadJsonFiles(files);

				expect(result).toHaveLength(2);
				expect(result[0].name).toBe("test1.json");
				expect(result[1].name).toBe("test2.json");
			});

			it("handles invalid JSON gracefully", async () => {
				const files: GitHubFileInfo[] = [
					{
						name: "invalid.json",
						path: "tests/invalid.json",
						type: "file",
						size: 100,
						download_url:
							"https://raw.githubusercontent.com/owner/repo/main/tests/invalid.json",
						sha: "xyz789",
					},
				];

				const result = await loader.downloadJsonFiles(files);

				expect(result).toHaveLength(0);
			});

			it("filters out failed downloads but continues with successful ones", async () => {
				const files: GitHubFileInfo[] = [
					{
						name: "valid.json",
						path: "tests/valid.json",
						type: "file",
						size: 1234,
						download_url:
							"https://raw.githubusercontent.com/owner/repo/main/tests/valid.json",
						sha: "abc123",
					},
					{
						name: "invalid.json",
						path: "tests/invalid.json",
						type: "file",
						size: 100,
						download_url:
							"https://raw.githubusercontent.com/owner/repo/main/tests/invalid.json",
						sha: "xyz789",
					},
				];

				const result = await loader.downloadJsonFiles(files);

				expect(result).toHaveLength(1);
				expect(result[0].name).toBe("valid.json");
			});

			it("handles empty file list", async () => {
				const result = await loader.downloadJsonFiles([]);
				expect(result).toHaveLength(0);
			});
		});

		describe("loadRepositoryData", () => {
			it("completes full workflow successfully", async () => {
				const result = await loader.loadRepositoryData(
					"https://github.com/owner/repo/tree/main/tests",
				);

				expect(result.files).toHaveLength(2);
				expect(result.repository).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "tests",
				});
				expect(result.metadata.source).toBe("github");
				expect(result.metadata.totalFiles).toBe(2);
				expect(result.metadata.successfulFiles).toBe(2);
				expect(result.metadata.loadedAt).toBeInstanceOf(Date);
			});

			it("throws error for invalid URL", async () => {
				await expect(loader.loadRepositoryData("invalid-url")).rejects.toThrow(
					"Invalid GitHub URL format",
				);
			});

			it("throws error for empty URL", async () => {
				await expect(loader.loadRepositoryData("")).rejects.toThrow(
					"URL cannot be empty",
				);
			});

			it("handles repository not found", async () => {
				await expect(
					loader.loadRepositoryData(
						"https://github.com/notfound/repo/tree/main/tests",
					),
				).rejects.toThrow("Repository, branch, or path not found");
			});

			it("handles private repository or rate limit", async () => {
				await expect(
					loader.loadRepositoryData(
						"https://github.com/private/repo/tree/main/tests",
					),
				).rejects.toThrow("Rate limit exceeded or repository is private");
			});

			it("processes different GitHub URL formats", async () => {
				const formats = [
					"https://github.com/owner/repo/tree/main/tests",
					"https://api.github.com/repos/owner/repo/contents/tests?ref=main",
				];

				for (const url of formats) {
					const result = await loader.loadRepositoryData(url);
					expect(result.files.length).toBeGreaterThan(0);
					expect(result.repository.owner).toBe("owner");
					expect(result.repository.repo).toBe("repo");
				}
			});
		});

		describe("getRepositoryInfo", () => {
			it("gets repository info without downloading files", async () => {
				const result = await loader.getRepositoryInfo(
					"https://github.com/owner/repo/tree/main/tests",
				);

				expect(result.fileCount).toBe(2);
				expect(result.files).toHaveLength(2);
				expect(result.repository).toEqual({
					owner: "owner",
					repo: "repo",
					branch: "main",
					path: "tests",
				});
			});

			it("throws error for invalid URL", async () => {
				await expect(loader.getRepositoryInfo("not-a-url")).rejects.toThrow(
					"Invalid GitHub URL format",
				);
			});

			it("handles repository not found", async () => {
				await expect(
					loader.getRepositoryInfo("https://github.com/notfound/repo"),
				).rejects.toThrow("Repository, branch, or path not found");
			});
		});
	});
});
