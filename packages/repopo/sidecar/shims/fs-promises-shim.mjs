import { promises } from "./fs-shim.mjs";

export const {
	readFile,
	writeFile,
	stat,
	lstat,
	access,
	mkdir,
	readdir,
	copyFile,
	unlink,
	rename,
	chmod,
	realpath,
	rmdir,
} = promises;

export default promises;
