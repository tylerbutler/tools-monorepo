import { readFile } from "node:fs/promises";

import { sha256 } from "./hash.js";

export type hashFn = (buffer: Buffer) => string;
export { sha256 };
export class FileHashCache {
	protected fileHashCaches = new Map<hashFn, Map<string, Promise<string>>>();

	private getFileHashCache(hash: hashFn) {
		let fileHashCache = this.fileHashCaches.get(hash);
		if (fileHashCache === undefined) {
			fileHashCache = new Map<string, Promise<string>>();
			this.fileHashCaches.set(hash, fileHashCache);
		}
		return fileHashCache;
	}
	public async getFileHash(path: string, hash: hashFn = sha256) {
		const fileHashCache = this.getFileHashCache(hash);
		const cachedHashP = fileHashCache.get(path);
		if (cachedHashP) {
			return cachedHashP;
		}

		const newHashP = readFile(path).then(hash);
		fileHashCache.set(path, newHashP);
		return newHashP;
	}

	public clear() {
		this.fileHashCaches.clear();
	}
}
