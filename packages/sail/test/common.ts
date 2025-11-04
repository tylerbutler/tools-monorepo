import { fileURLToPath } from "node:url";
import path from "pathe";

// const vol = Volume.fromJSON({ "/file.txt": "file.txt" });
// const ufs1 = new Union();
// ufs1.use(fs).use(vol as any);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const testDataPath = path.join(__dirname, "data");

export const testUrls = [
	"http://localhost:8080/test0.json",
	"http://localhost:8080/test1.json",
	"http://localhost:8080/tarball2.tar.gz",
	"http://localhost:8080/tarball3.tar",
	"http://localhost:8080/test4.zip",
].map((s) => new URL(s));
