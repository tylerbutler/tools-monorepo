import type { Stats } from "node:fs";

/**
 * File metadata for mock file system
 */
export interface MockFileMetadata {
	path: string;
	mtime: Date;
	content?: string;
	size?: number;
	isDirectory?: boolean;
}

/**
 * Mock file system for testing file-based up-to-date checking.
 *
 * Simulates file system operations without requiring actual file I/O.
 * Useful for testing incremental build logic that depends on file modification times.
 *
 * @example
 * ```typescript
 * const mockFs = new MockFileSystem()
 *   .addFile("src/index.ts", new Date("2024-01-01"), "export const x = 1;")
 *   .addFile("dist/index.js", new Date("2024-01-02"));
 *
 * expect(mockFs.exists("src/index.ts")).toBe(true);
 * expect(mockFs.isNewer("dist/index.js", "src/index.ts")).toBe(true);
 * ```
 */
export class MockFileSystem {
	private files = new Map<string, MockFileMetadata>();

	/**
	 * Add a file to the mock file system
	 */
	addFile(
		path: string,
		mtime: Date,
		content?: string,
		size?: number,
	): this {
		this.files.set(path, {
			path,
			mtime,
			content,
			size: size ?? content?.length ?? 0,
			isDirectory: false,
		});
		return this;
	}

	/**
	 * Add a directory to the mock file system
	 */
	addDirectory(path: string, mtime: Date = new Date()): this {
		this.files.set(path, {
			path,
			mtime,
			isDirectory: true,
		});
		return this;
	}

	/**
	 * Add multiple files at once
	 */
	addFiles(files: Array<{ path: string; mtime: Date; content?: string }>): this {
		for (const file of files) {
			this.addFile(file.path, file.mtime, file.content);
		}
		return this;
	}

	/**
	 * Update file modification time (simulate file touch)
	 */
	touchFile(path: string, mtime: Date = new Date()): this {
		const file = this.files.get(path);
		if (file) {
			file.mtime = mtime;
		}
		return this;
	}

	/**
	 * Delete a file from the mock file system
	 */
	deleteFile(path: string): this {
		this.files.delete(path);
		return this;
	}

	/**
	 * Check if a file exists
	 */
	exists(path: string): boolean {
		return this.files.has(path);
	}

	/**
	 * Get file metadata
	 */
	getFile(path: string): MockFileMetadata | undefined {
		return this.files.get(path);
	}

	/**
	 * Get file modification time
	 */
	getMtime(path: string): Date | undefined {
		return this.files.get(path)?.mtime;
	}

	/**
	 * Get file content
	 */
	getContent(path: string): string | undefined {
		return this.files.get(path)?.content;
	}

	/**
	 * Get file size
	 */
	getSize(path: string): number | undefined {
		return this.files.get(path)?.size;
	}

	/**
	 * Check if path is a directory
	 */
	isDirectory(path: string): boolean {
		return this.files.get(path)?.isDirectory ?? false;
	}

	/**
	 * Check if first file is newer than second file
	 */
	isNewer(path1: string, path2: string): boolean {
		const mtime1 = this.getMtime(path1);
		const mtime2 = this.getMtime(path2);

		if (!mtime1 || !mtime2) {
			return false;
		}

		return mtime1 > mtime2;
	}

	/**
	 * Get all files matching a pattern
	 */
	findFiles(pattern: RegExp): string[] {
		return Array.from(this.files.keys()).filter((path) => pattern.test(path));
	}

	/**
	 * Clear all files
	 */
	clear(): this {
		this.files.clear();
		return this;
	}

	/**
	 * Get all file paths
	 */
	getAllPaths(): string[] {
		return Array.from(this.files.keys());
	}

	/**
	 * Create a mock Stats object for compatibility with fs.Stats
	 */
	createMockStats(path: string): Partial<Stats> | undefined {
		const file = this.files.get(path);
		if (!file) {
			return undefined;
		}

		return {
			mtime: file.mtime,
			mtimeMs: file.mtime.getTime(),
			size: file.size ?? 0,
			isDirectory: () => file.isDirectory ?? false,
			isFile: () => !file.isDirectory,
			isSymbolicLink: () => false,
			isBlockDevice: () => false,
			isCharacterDevice: () => false,
			isFIFO: () => false,
			isSocket: () => false,
		} as Partial<Stats>;
	}
}
