/**
 * GitHub API service for loading CCL test data from repositories
 */

export interface GitHubFileInfo {
	name: string;
	path: string;
	size: number;
	download_url: string;
	type: "file" | "dir";
	sha: string;
}

export interface GitHubRepository {
	owner: string;
	repo: string;
	branch?: string;
	path?: string;
}

export interface GitHubLoadResult {
	files: GitHubFileInfo[];
	repository: GitHubRepository;
	loadedAt: Date;
}

export class GitHubAPIError extends Error {
	constructor(
		message: string,
		public status?: number,
		public response?: Response,
	) {
		super(message);
		this.name = "GitHubAPIError";
	}
}

export class GitHubLoader {
	private readonly baseUrl = "https://api.github.com";

	/**
	 * Parse various GitHub URL formats into repository information
	 */
	parseGitHubUrl(url: string): GitHubRepository | null {
		try {
			const urlObj = new URL(url);

			// Handle different GitHub URL formats
			if (urlObj.hostname === "github.com") {
				// Repository URL: https://github.com/owner/repo or https://github.com/owner/repo/tree/branch/path
				const pathParts = urlObj.pathname.split("/").filter(Boolean);
				if (pathParts.length < 2) {
					return null;
				}

				const [owner, repo, ...rest] = pathParts;
				let branch = "main";
				let path = "";

				if (rest.length > 0 && rest[0] === "tree") {
					branch = rest[1] || "main";
					path = rest.slice(2).join("/");
				}

				return { owner, repo, branch, path };
			}

			if (urlObj.hostname === "api.github.com") {
				// API URL: https://api.github.com/repos/owner/repo/contents/path?ref=branch
				const pathParts = urlObj.pathname.split("/").filter(Boolean);
				if (pathParts.length < 3 || pathParts[0] !== "repos") {
					return null;
				}

				const [, owner, repo, ...rest] = pathParts;
				const branch = urlObj.searchParams.get("ref") || "main";
				const path = rest.length > 1 ? rest.slice(1).join("/") : "";

				return { owner, repo, branch, path };
			}

			if (urlObj.hostname === "raw.githubusercontent.com") {
				// Raw URL: https://raw.githubusercontent.com/owner/repo/branch/path/file.json
				const pathParts = urlObj.pathname.split("/").filter(Boolean);
				if (pathParts.length < 3) {
					return null;
				}

				const [owner, repo, branch, ...pathSegments] = pathParts;
				const path = pathSegments.join("/");

				return { owner, repo, branch, path };
			}

			return null;
		} catch {
			return null;
		}
	}

	/**
	 * Validate that a URL points to a GitHub repository
	 */
	validateGitHubUrl(url: string): {
		valid: boolean;
		error?: string;
		repository?: GitHubRepository;
	} {
		if (!url.trim()) {
			return { valid: false, error: "URL cannot be empty" };
		}

		const repository = this.parseGitHubUrl(url);
		if (!repository) {
			return { valid: false, error: "Invalid GitHub URL format" };
		}

		if (!(repository.owner && repository.repo)) {
			return {
				valid: false,
				error: "URL must include owner and repository name",
			};
		}

		return { valid: true, repository };
	}

	/**
	 * Load repository contents from GitHub API
	 */
	async loadRepository(
		repository: GitHubRepository,
	): Promise<GitHubLoadResult> {
		const { owner, repo, branch = "main", path = "" } = repository;

		try {
			const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`;
			const params = new URLSearchParams();
			if (branch !== "main") {
				params.set("ref", branch);
			}

			const fullUrl = params.toString() ? `${url}?${params}` : url;
			const response = await fetch(fullUrl);

			if (!response.ok) {
				if (response.status === 404) {
					throw new GitHubAPIError(
						"Repository, branch, or path not found",
						404,
						response,
					);
				}
				if (response.status === 403) {
					throw new GitHubAPIError(
						"Rate limit exceeded or repository is private",
						403,
						response,
					);
				}
				throw new GitHubAPIError(
					`GitHub API error: ${response.statusText}`,
					response.status,
					response,
				);
			}

			const data = await response.json();

			// Handle single file response
			if (!Array.isArray(data)) {
				if (data.type === "file") {
					return {
						files: [data as GitHubFileInfo],
						repository,
						loadedAt: new Date(),
					};
				}
				throw new GitHubAPIError("Path points to a directory, not a file");
			}

			// Filter for JSON files only
			const jsonFiles = data.filter(
				(item: GitHubFileInfo) =>
					item.type === "file" && item.name.endsWith(".json"),
			);

			return {
				files: jsonFiles,
				repository,
				loadedAt: new Date(),
			};
		} catch (error) {
			if (error instanceof GitHubAPIError) {
				throw error;
			}
			throw new GitHubAPIError(
				`Failed to load repository: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Download and parse JSON files from GitHub
	 */
	async downloadJsonFiles(
		files: GitHubFileInfo[],
	): Promise<{ name: string; content: any; url: string }[]> {
		const results = await Promise.allSettled(
			files.map(async (file) => {
				const response = await fetch(file.download_url);
				if (!response.ok) {
					throw new Error(
						`Failed to download ${file.name}: ${response.statusText}`,
					);
				}

				const text = await response.text();
				try {
					const content = JSON.parse(text);
					return { name: file.name, content, url: file.download_url };
				} catch {
					throw new Error(`Invalid JSON in ${file.name}`);
				}
			}),
		);

		const successful = results
			.filter(
				(
					result,
				): result is PromiseFulfilledResult<{
					name: string;
					content: any;
					url: string;
				}> => result.status === "fulfilled",
			)
			.map((result) => result.value);

		const failed = results
			.filter(
				(result): result is PromiseRejectedResult =>
					result.status === "rejected",
			)
			.map((result) => result.reason);

		if (failed.length > 0) {
		}

		return successful;
	}

	/**
	 * Complete workflow: load repository and download JSON files
	 */
	async loadRepositoryData(url: string): Promise<{
		files: { name: string; content: any; url: string }[];
		repository: GitHubRepository;
		metadata: {
			loadedAt: Date;
			totalFiles: number;
			successfulFiles: number;
			source: "github";
		};
	}> {
		const validation = this.validateGitHubUrl(url);
		if (!validation.valid) {
			throw new GitHubAPIError(validation.error || "Invalid URL");
		}

		const repositoryResult = await this.loadRepository(validation.repository!);
		const downloadedFiles = await this.downloadJsonFiles(
			repositoryResult.files,
		);

		return {
			files: downloadedFiles,
			repository: repositoryResult.repository,
			metadata: {
				loadedAt: repositoryResult.loadedAt,
				totalFiles: repositoryResult.files.length,
				successfulFiles: downloadedFiles.length,
				source: "github" as const,
			},
		};
	}

	/**
	 * Get repository information without downloading files
	 */
	async getRepositoryInfo(url: string): Promise<{
		repository: GitHubRepository;
		fileCount: number;
		files: GitHubFileInfo[];
	}> {
		const validation = this.validateGitHubUrl(url);
		if (!validation.valid) {
			throw new GitHubAPIError(validation.error || "Invalid URL");
		}

		const result = await this.loadRepository(validation.repository!);

		return {
			repository: result.repository,
			fileCount: result.files.length,
			files: result.files,
		};
	}
}

// Export singleton instance
export const githubLoader = new GitHubLoader();
