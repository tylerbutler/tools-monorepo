import * as fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Volume } from "memfs";
import * as snapshot from "memfs/lib/snapshot";
import { http, HttpResponse } from "msw";
import { Union, ufs } from "unionfs";
import { assert, beforeEach, describe, expect, it, vi } from "vitest";

// const vol = Volume.fromJSON({ "/file.txt": "file.txt" });
// const ufs1 = new Union();
// ufs1.use(fs).use(vol as any);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const testDataPath = path.join(__dirname, "data");
// const snap = snapshot.toSnapshotSync({ fs, testDataPath });

const testFiles = [
	"test0.json",
	"test1.json",
	"tarball2.tar.gz",
	"tarball3.tar",
	"test4.zip",
];

// Write test files to memfs volume.
// vol.mkdirSync("/data");
// for (const f of testFiles) {
// 	const fPath = path.join(testDataPath, f);
// 	const contents = ufs.readFileSync(fPath, { encoding: "utf8" });
// 	vol.writeFileSync(`/data/${f}`, contents);
// }

// const testFsSnapshot = vol.toJSON();
// console.debug(testFsSnapshot);

// export const baseTestUrl = "http://dill-test.com/data";
// export const baseTestUrl = "http://localhost/files";

export const getTestUrls = (baseUrl: string) =>
	testFiles.map((f) => new URL(`${baseUrl}/${f}`));

// export const wellFormedUrls = testFiles.map(
// 	(f) => `${baseTestUrl}/well-formed/${f}`,
// );
// const wellFormedPaths = testFiles.map((f) => `${baseTestUrl}/well-formed/${f}`);
