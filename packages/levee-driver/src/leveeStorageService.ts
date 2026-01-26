/**
 * Document storage service for Levee server.
 */

import type {
	ICreateBlobResponse,
	IDocumentStorageService,
	IDocumentStorageServicePolicies,
	ISnapshotTree,
	ISummaryContext,
	IVersion,
} from "@fluidframework/driver-definitions/internal";
import type {
	ISummaryHandle,
	ISummaryTree,
	SummaryType,
} from "@fluidframework/protocol-definitions";

import type { DocumentVersion, GitTree } from "./contracts.js";
import { type GitCreateTreeEntry, GitManager } from "./gitManager.js";
import type { RestWrapper } from "./restWrapper.js";

/**
 * Document storage service implementation for Levee server.
 *
 * @remarks
 * Provides storage operations for snapshots, blobs, and summaries
 * via the Git-like storage API.
 *
 * @internal
 */
export class LeveeStorageService implements IDocumentStorageService {
	public readonly policies: IDocumentStorageServicePolicies = {
		caching: undefined, // No special caching policy
	};

	private readonly gitManager: GitManager;
	private readonly restWrapper: RestWrapper;
	private readonly documentId: string;
	private readonly tenantId: string;

	/**
	 * Creates a new LeveeStorageService.
	 *
	 * @param restWrapper - REST client for API requests
	 * @param tenantId - The tenant ID
	 * @param documentId - The document ID
	 */
	public constructor(
		restWrapper: RestWrapper,
		tenantId: string,
		documentId: string,
	) {
		this.restWrapper = restWrapper;
		this.tenantId = tenantId;
		this.documentId = documentId;
		this.gitManager = new GitManager(restWrapper, `/repos/${tenantId}`);
	}

	/**
	 * Gets available versions (snapshots) for the document.
	 *
	 * @param versionId - Optional version ID to start from
	 * @param count - Maximum number of versions to return
	 * @returns Array of available versions
	 */
	public async getVersions(
		_versionId: string | null,
		count: number,
	): Promise<IVersion[]> {
		const commits = await this.restWrapper.get<DocumentVersion[]>(
			`/repos/${this.tenantId}/commits?sha=${this.documentId}&count=${count}`,
		);

		return commits.map((commit) => ({
			id: commit.id,
			treeId: commit.treeId,
			date: commit.date,
		}));
	}

	/**
	 * Gets the snapshot tree for a specific version.
	 *
	 * @param version - The version to get (latest if not specified)
	 * @returns The snapshot tree or null if not found
	 */
	public async getSnapshotTree(
		version?: IVersion,
	): Promise<ISnapshotTree | null> {
		const sha = version?.treeId;

		if (!sha) {
			// Get latest version
			const versions = await this.getVersions(null, 1);
			if (versions.length === 0) {
				return null;
			}
			const treeId = versions[0]?.treeId;
			if (!treeId) {
				return null;
			}
			return this.getSnapshotTreeCore(treeId);
		}

		return this.getSnapshotTreeCore(sha);
	}

	/**
	 * Reads a blob by its ID.
	 *
	 * @param blobId - The blob's SHA hash
	 * @returns The blob content as ArrayBuffer
	 */
	public async readBlob(blobId: string): Promise<ArrayBufferLike> {
		const blob = await this.gitManager.getBlob(blobId);

		if (blob.encoding === "base64") {
			// Decode base64 to ArrayBuffer
			const binaryString = atob(blob.content);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			return bytes.buffer;
		}

		// UTF-8 encoding
		const encoder = new TextEncoder();
		return encoder.encode(blob.content).buffer;
	}

	/**
	 * Creates a new blob.
	 *
	 * @param file - The blob content as ArrayBuffer
	 * @returns The created blob's ID
	 */
	public async createBlob(file: ArrayBufferLike): Promise<ICreateBlobResponse> {
		// Convert ArrayBuffer to base64
		const bytes = new Uint8Array(file);
		let binary = "";
		for (const byte of bytes) {
			binary += String.fromCharCode(byte);
		}
		const base64Content = btoa(binary);

		const blob = await this.gitManager.createBlob(base64Content, "base64");

		return { id: blob.sha };
	}

	/**
	 * Uploads a summary tree.
	 *
	 * @param summary - The summary tree to upload
	 * @param context - The summary context
	 * @returns The uploaded summary's handle (commit SHA)
	 */
	public async uploadSummaryWithContext(
		summary: ISummaryTree,
		context: ISummaryContext,
	): Promise<string> {
		const handle = await this.writeSummaryTree(summary);

		// Create commit
		const parents: string[] = [];
		if (context.ackHandle) {
			parents.push(context.ackHandle);
		}

		const commit = await this.gitManager.createCommit({
			message: `Summary at seq ${context.referenceSequenceNumber}`,
			tree: handle,
			parents,
			author: {
				name: "Levee Service",
				email: "levee@example.com",
			},
		});

		// Update ref to point to new commit
		await this.gitManager
			.updateRef(`heads/${this.documentId}`, commit.sha, true)
			.catch(() => {
				// Ref might not exist yet, that's ok
			});

		return commit.sha;
	}

	/**
	 * Downloads a summary snapshot.
	 *
	 * @param handle - The summary handle
	 * @returns The summary snapshot
	 */
	public async downloadSummary(handle: ISummaryHandle): Promise<ISummaryTree> {
		const handleStr = typeof handle === "string" ? handle : handle.handle;
		const commit = await this.gitManager.getCommit(handleStr);
		const tree = await this.gitManager.getTree(commit.tree.sha, true);
		return this.convertTreeToSummary(tree);
	}

	/**
	 * Disposes resources held by this service.
	 */
	public dispose(): void {
		// No resources to dispose
	}

	/**
	 * Gets a snapshot tree by SHA.
	 */
	private async getSnapshotTreeCore(sha: string): Promise<ISnapshotTree> {
		const tree = await this.gitManager.getTree(sha, true);
		return this.convertGitTreeToSnapshotTree(tree);
	}

	/**
	 * Converts a Git tree to a Fluid snapshot tree.
	 */
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: tree conversion requires nested logic
	private convertGitTreeToSnapshotTree(gitTree: GitTree): ISnapshotTree {
		const snapshotTree: ISnapshotTree = {
			blobs: {},
			trees: {},
			id: gitTree.sha,
		};

		// Build nested structure from flat tree entries
		const pathMap = new Map<string, ISnapshotTree>();
		pathMap.set("", snapshotTree);

		// Sort entries so parent directories come before children
		const sortedEntries = [...gitTree.tree].sort((a, b) =>
			a.path.localeCompare(b.path),
		);

		for (const entry of sortedEntries) {
			const pathParts = entry.path.split("/");
			const name = pathParts.at(-1) ?? "";
			pathParts.pop();
			const parentPath = pathParts.join("/");

			// Ensure parent exists
			let parent = pathMap.get(parentPath);
			if (!parent) {
				// Create parent directories as needed
				let currentPath = "";
				parent = snapshotTree;
				for (const part of pathParts) {
					currentPath = currentPath ? `${currentPath}/${part}` : part;
					let existingTree = pathMap.get(currentPath);
					if (!existingTree) {
						existingTree = { blobs: {}, trees: {} };
						parent.trees[part] = existingTree;
						pathMap.set(currentPath, existingTree);
					}
					parent = existingTree;
				}
			}

			if (entry.type === "blob") {
				parent.blobs[name] = entry.sha;
			} else {
				const childTree: ISnapshotTree = { blobs: {}, trees: {} };
				parent.trees[name] = childTree;
				pathMap.set(entry.path, childTree);
			}
		}

		return snapshotTree;
	}

	/**
	 * Writes a summary tree to storage.
	 */
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles multiple summary types
	private async writeSummaryTree(
		tree: ISummaryTree,
		path = "",
	): Promise<string> {
		const entries: GitCreateTreeEntry[] = [];

		for (const [key, value] of Object.entries(tree.tree)) {
			const entryPath = path ? `${path}/${key}` : key;

			// SummaryType enum: Blob = 2, Handle = 3, Tree = 1, Attachment = 4
			if (value.type === 2) {
				// Blob
				const blobValue = value as { type: 2; content: string | Uint8Array };
				const content =
					typeof blobValue.content === "string"
						? blobValue.content
						: btoa(
								Array.from(new Uint8Array(blobValue.content))
									.map((b) => String.fromCharCode(b))
									.join(""),
							);
				const encoding =
					typeof blobValue.content === "string" ? "utf-8" : "base64";
				const blob = await this.gitManager.createBlob(content, encoding);
				entries.push({
					path: key,
					mode: "100644",
					type: "blob",
					sha: blob.sha,
				});
			} else if (value.type === 1) {
				// Tree
				const treeValue = value as ISummaryTree;
				const subtreeSha = await this.writeSummaryTree(treeValue, entryPath);
				entries.push({
					path: key,
					mode: "040000",
					type: "tree",
					sha: subtreeSha,
				});
			} else if (value.type === 3) {
				// Handle
				const handleValue = value as {
					type: 3;
					handle: string;
					handleType: SummaryType;
				};
				entries.push({
					path: key,
					mode: handleValue.handleType === 1 ? "040000" : "100644",
					type: handleValue.handleType === 1 ? "tree" : "blob",
					sha: handleValue.handle,
				});
			} else if (value.type === 4) {
				// Attachment
				const attachmentValue = value as { type: 4; id: string };
				const attachmentBlob = await this.gitManager.createBlob(
					attachmentValue.id,
					"utf-8",
				);
				entries.push({
					path: key,
					mode: "100644",
					type: "blob",
					sha: attachmentBlob.sha,
				});
			}
		}

		const gitTree = await this.gitManager.createTree({ tree: entries });
		return gitTree.sha;
	}

	/**
	 * Converts a Git tree to a summary tree.
	 */
	private async convertTreeToSummary(tree: GitTree): Promise<ISummaryTree> {
		const summaryTree: ISummaryTree = {
			type: 1, // SummaryType.Tree
			tree: {},
		};

		for (const entry of tree.tree) {
			if (entry.type === "blob") {
				const blob = await this.gitManager.getBlob(entry.sha);
				const content =
					blob.encoding === "base64"
						? Uint8Array.from(atob(blob.content), (c) => c.charCodeAt(0))
						: blob.content;

				summaryTree.tree[entry.path] = {
					type: 2, // SummaryType.Blob
					content,
				};
			} else {
				const subtree = await this.gitManager.getTree(entry.sha);
				summaryTree.tree[entry.path] = await this.convertTreeToSummary(subtree);
			}
		}

		return summaryTree;
	}
}
