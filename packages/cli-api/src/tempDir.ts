import fs from "node:fs/promises";
import os from "node:os";
import { test } from "vitest";
// import path from "node:path";

export interface TempDirFixture {
	tempDir: string;
}

async function createTempDir() {
	const ostempdir = os.tmpdir();
	// const tempdir = path.join(ostempdir, "test");
	return await fs.mkdtemp(ostempdir);
}

/**
 * Extends the vitest context with a path to a temporary directory.
 * @beta
 */
export const testWithTempDir = test.extend<TempDirFixture>({
	// biome-ignore lint/correctness/noEmptyPattern: TODO - worth fixing?
	tempDir: async ({}, use) => {
		const directory = await createTempDir();
		await use(directory);
		await fs.rm(directory, { recursive: true });
	},
});
