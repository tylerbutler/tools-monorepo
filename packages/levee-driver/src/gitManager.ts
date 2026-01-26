/**
 * Git storage manager for blob, tree, and commit operations.
 */

import type { IGitBlob, IGitCommit, IGitTree } from "./contracts.js";
import type { RestWrapper } from "./restWrapper.js";

/**
 * Git tree entry for creating new trees.
 */
export interface IGitCreateTreeEntry {
	path: string;
	mode: string;
	type: "blob" | "tree";
	sha?: string;
	content?: string;
}

/**
 * Request for creating a new tree.
 */
export interface IGitCreateTreeRequest {
	tree: IGitCreateTreeEntry[];
	base_tree?: string;
}

/**
 * Request for creating a new commit.
 */
export interface IGitCreateCommitRequest {
	message: string;
	tree: string;
	parents: string[];
	author?: {
		name: string;
		email: string;
		date?: string;
	};
}

/**
 * Manager for Git-like storage operations.
 *
 * @remarks
 * Provides methods for working with blobs, trees, and commits
 * in the Levee storage backend.
 *
 * @internal
 */
export class GitManager {
	private readonly restWrapper: RestWrapper;
	private readonly storageUrl: string;

	/**
	 * Creates a new GitManager.
	 *
	 * @param restWrapper - REST client for making requests
	 * @param storageUrl - Base URL for storage operations (e.g., /repos/tenantId)
	 */
	public constructor(restWrapper: RestWrapper, storageUrl: string) {
		this.restWrapper = restWrapper;
		this.storageUrl = storageUrl;
	}

	/**
	 * Gets a blob by its SHA.
	 *
	 * @param sha - The blob's SHA hash
	 * @returns The blob content and metadata
	 */
	public async getBlob(sha: string): Promise<IGitBlob> {
		return this.restWrapper.get<IGitBlob>(
			`${this.storageUrl}/git/blobs/${sha}`,
		);
	}

	/**
	 * Creates a new blob with the given content.
	 *
	 * @param content - The blob content (base64 encoded or UTF-8 string)
	 * @param encoding - The encoding of the content
	 * @returns The created blob metadata
	 */
	public async createBlob(
		content: string,
		encoding: "base64" | "utf-8" = "utf-8",
	): Promise<IGitBlob> {
		return this.restWrapper.post<IGitBlob>(`${this.storageUrl}/git/blobs`, {
			content,
			encoding,
		});
	}

	/**
	 * Gets a tree by its SHA.
	 *
	 * @param sha - The tree's SHA hash
	 * @param recursive - Whether to fetch tree entries recursively
	 * @returns The tree structure
	 */
	public async getTree(sha: string, recursive = false): Promise<IGitTree> {
		const recursiveParam = recursive ? "?recursive=1" : "";
		return this.restWrapper.get<IGitTree>(
			`${this.storageUrl}/git/trees/${sha}${recursiveParam}`,
		);
	}

	/**
	 * Creates a new tree.
	 *
	 * @param request - The tree creation request
	 * @returns The created tree metadata
	 */
	public async createTree(request: IGitCreateTreeRequest): Promise<IGitTree> {
		return this.restWrapper.post<IGitTree>(
			`${this.storageUrl}/git/trees`,
			request,
		);
	}

	/**
	 * Gets a commit by its SHA.
	 *
	 * @param sha - The commit's SHA hash
	 * @returns The commit metadata
	 */
	public async getCommit(sha: string): Promise<IGitCommit> {
		return this.restWrapper.get<IGitCommit>(
			`${this.storageUrl}/git/commits/${sha}`,
		);
	}

	/**
	 * Creates a new commit.
	 *
	 * @param request - The commit creation request
	 * @returns The created commit metadata
	 */
	public async createCommit(
		request: IGitCreateCommitRequest,
	): Promise<IGitCommit> {
		return this.restWrapper.post<IGitCommit>(
			`${this.storageUrl}/git/commits`,
			request,
		);
	}

	/**
	 * Gets refs (branches/tags).
	 *
	 * @returns List of refs
	 */
	public async getRefs(): Promise<
		Array<{
			ref: string;
			object: { sha: string; type: string; url: string };
		}>
	> {
		return this.restWrapper.get(`${this.storageUrl}/git/refs`);
	}

	/**
	 * Gets a specific ref.
	 *
	 * @param ref - The ref name (e.g., "heads/main")
	 * @returns The ref data
	 */
	public async getRef(ref: string): Promise<{
		ref: string;
		object: { sha: string; type: string; url: string };
	}> {
		return this.restWrapper.get(`${this.storageUrl}/git/refs/${ref}`);
	}

	/**
	 * Creates or updates a ref.
	 *
	 * @param ref - The ref name
	 * @param sha - The SHA to point to
	 * @param force - Whether to force update
	 * @returns The updated ref
	 */
	public async updateRef(
		ref: string,
		sha: string,
		force = false,
	): Promise<{
		ref: string;
		object: { sha: string; type: string; url: string };
	}> {
		return this.restWrapper.patch(`${this.storageUrl}/git/refs/${ref}`, {
			sha,
			force,
		});
	}
}
