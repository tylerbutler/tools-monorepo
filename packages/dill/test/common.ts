import { http, HttpResponse } from "msw";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ufs, Union } from "unionfs";
import { Volume } from "memfs";
import * as snapshot from "memfs/lib/snapshot";

const vol = Volume.fromJSON({ "/file.txt": "file.txt" });
const ufs1 = new Union();
ufs1.use(fs).use(vol as any);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDataPath = path.join(__dirname, "data");
const snap = snapshot.toSnapshotSync({ fs, testDataPath });

const testFiles = [
	"test0.json",
	"test1.json",
	"tarball2.tar.gz",
	"tarball3.tar",
	"test4.zip",
];

// Write test files to memfs volume.
vol.mkdirSync("/data");
for (const f of testFiles) {
	const fPath = path.join(testDataPath, f);
	const contents = ufs.readFileSync(fPath, { encoding: "utf8" });
	vol.writeFileSync(`/data/${f}`, contents);
}

const testFsSnapshot = vol.toJSON();
console.debug(testFsSnapshot);

export const baseTestUrl = "http://dill-test.com/data";

export const getTestUrls = (baseUrl = baseTestUrl) =>
	testFiles.map((f) => new URL(`${baseUrl}/${f}`));

// export const wellFormedUrls = testFiles.map(
// 	(f) => `${baseTestUrl}/well-formed/${f}`,
// );
// const wellFormedPaths = testFiles.map((f) => `${baseTestUrl}/well-formed/${f}`);

// export const handlers = [
// 	http.get("/data/:file", ({ params }) => {
// 		// All request path params are provided in the "params"
// 		// argument of the response resolver.
// 		const { file: filePath } = params;

// 		const file = await readFile();

// 		// Respond with a "404 Not Found" response if the given
// 		// post ID does not exist.
// 		if (!deletedPost) {
// 			return new HttpResponse(null, { status: 404 });
// 		}

// 		// Delete the post from the "allPosts" map.
// 		allPosts.delete(id);

// 		// Respond with a "200 OK" response and the deleted post.
// 		return HttpResponse.json(deletedPost);
// 	}),
// ];
