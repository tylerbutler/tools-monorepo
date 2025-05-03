import { fileURLToPath } from "node:url";
import path from "pathe";

// const vol = Volume.fromJSON({ "/file.txt": "file.txt" });
// const ufs1 = new Union();
// ufs1.use(fs).use(vol as any);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const testDataPath = path.join(__dirname, "data");

export const getTestUrls = (port: number) =>
	[
		`http://localhost:${port}/test0.json`,
		`http://localhost:${port}/test1.json`,
		`http://localhost:${port}/tarball2.tar.gz`,
		`http://localhost:${port}/tarball3.tar`,
		`http://localhost:${port}/test4.zip`,
		`http://localhost:${port}/test5.json.gz`,
	].map((s) => new URL(s));
