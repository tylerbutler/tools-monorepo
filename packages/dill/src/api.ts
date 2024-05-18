import { existsSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TarLocalFile } from "@andrewbranch/untar.js";
import { untar } from "@andrewbranch/untar.js";
import { parse as parseContentDisposition } from "@tinyhttp/content-disposition";
import { Decompress } from "fflate";
import { fileTypeFromBuffer } from "file-type";
import { ensureDirSync } from "fs-extra";
import mime from "mime";
import fetch from "node-fetch-native";
import type { SetOptional } from "type-fest";

const fileProtocol = "file://";

const knownArchiveExtensions: ReadonlySet<string> = new Set([
	"7z",
	"bz2",
	"gz",
	"rar",
	"tar",
	"zip",
	"xz",
	"gz",
]);

/**
 * The default name to use for the downloaded file. This is only used if the name is not provided by the caller or
 * cannot be determined from the fetch response.
 */
const defaultDownloadName = "dill-download";

/**
 * Options used to control Dill's behavior.
 *
 * @public
 */
export interface DillOptions {
	/**
	 * If set to `true`, try extracting the file using [`fflate`](https://www.npmjs.com/package/fflate). Default value is
	 * false.
	 */
	extract?: boolean;

	/**
	 * The directory to download the file. If this path is undefined, then the current working directory will be used.
	 *
	 * If provided, this path must be to a directory that exists.
	 */
	downloadDir?: string;

	/**
	 * If provided, the filename to download the file to, including file extensions if applicable. If this is not
	 * provided, the downloaded file will use the name in the Content-Disposition response header, if available. Otherwise
	 * it will use `dill-download.<EXTENSION>`.
	 */
	filename?: string | undefined;

	/**
	 * If true, the file will not be saved to the file system. The file contents will be returned by the function call,
	 * but it will otherwise not be saved.
	 */
	noFile?: boolean;
}

/**
 * Resolved options type. All the options become required when resolved except for filename.
 */
export interface DillOptionsResolved
	extends SetOptional<Required<DillOptions>, "filename"> {
	// fullDownloadPath: string,
}

function resolveOptions(options?: DillOptions): Readonly<DillOptionsResolved> {
	const resolved = {
		extract: options?.extract ?? false,
		downloadDir: options?.downloadDir ?? process.cwd(),
		filename: options?.filename,
		noFile: options?.noFile ?? false,
	};

	// const fullDownloadPath = resolved.filename === undefined ?

	return resolved;
}

/**
 *	Downloads a file from a URL.
 *
 * @param url - The URL to download.
 * @param options - Options to use.
 * @returns The file's contents
 *
 * @public
 */
export const download = async (
	url: string,
	options?: DillOptions,
): Promise<{
	data: Uint8Array;
}> => {
	const {
		extract,
		downloadDir,
		filename: providedFilename,
		noFile,
	} = resolveOptions(options);

	// The downloadDir must exist and be a directory.
	if (!existsSync(downloadDir)) {
		throw new Error(`Path doesn't exist: ${downloadDir}`);
	}
	const pathStats = statSync(downloadDir);
	if (extract && !pathStats.isDirectory()) {
		throw new Error(`Path is not a directory: ${downloadDir}`);
	}

	const { contents: file, response } = await fetchFile(url);
	let extension: string;
	let filename = providedFilename;

	if (response === undefined) {
		const filetype = await fileTypeFromBuffer(file);
		if (filetype === undefined) {
			throw new Error(`Can't find file type for URL: ${url}`);
		}
		extension = filetype.ext;
		filename ??= `${defaultDownloadName}.${extension}`;
	} else {
		const {
			mimeType,
			extension: ext,
			filename: responseFileName,
		} = getMimeType(response);
		if (mimeType === undefined || ext === null) {
			throw new Error(`Can't find file type for URL: ${url}`);
		}
		extension = ext;
		filename ??= responseFileName ?? `${defaultDownloadName}.${extension}`;
	}

	const decompressed =
		extract && knownArchiveExtensions.has(extension) ? decompress(file) : file;

	if (extract) {
		await extractTarball(decompressed, downloadDir);
	} else if (!noFile) {
		const saveFile = path.join(downloadDir, filename);
		await writeFile(saveFile, decompressed);
	}
	return { data: decompressed };
};

async function readFileIntoUint8Array(filePath: string): Promise<Uint8Array> {
	const buffer = await readFile(filePath);
	return new Uint8Array(buffer.buffer);
}

function getMimeType(response: Response): {
	mimeType: string;
	extension: string | null;
	filename: string | undefined;
} {
	const { url } = response;
	const contentType = response?.headers.get("Content-Type");
	const urlType = mime.getType(url);
	const mimeType = contentType ?? urlType ?? null;
	const contentDispositionHeader = response?.headers.get("Content-Disposition");
	const contentDisposition =
		contentDispositionHeader === undefined || contentDispositionHeader === null
			? undefined
			: parseContentDisposition(contentDispositionHeader);

	console.debug(`Content-Type header: ${contentType}`);
	console.debug(`Content-Disposition header: ${contentDispositionHeader}`);
	console.debug(`Type from URL: ${urlType}`);
	if (mimeType === null) {
		throw new Error(`Can't find mime type for URL: ${url}`);
	}

	const extension = mime.getExtension(mimeType);
	return {
		mimeType,
		extension,
		filename: contentDisposition?.parameters.filename as string,
	};
}

/**
 * Fetches the file at the given URL and returns it as an in-memory Uint8Array.
 *
 * @param fileUrl - The URL of the file. If the URL begins with `file://`, then the path will be treated as a file
 * system path and loaded using `node:fs.readFile`.
 * @returns The file contents as a Uint8Array.
 */
export async function fetchFile(
	fileUrl: string,
): Promise<{ contents: Uint8Array; response?: Response }> {
	if (fileUrl.startsWith(fileProtocol)) {
		const filePath = fileUrl.slice(fileProtocol.length);
		return { contents: await readFileIntoUint8Array(filePath) };
	}

	const response = await fetch(fileUrl);

	const contents = new Uint8Array(
		(await response.arrayBuffer()) satisfies ArrayBuffer,
	);
	return { contents, response };
}

export function decompress(fileContent: Uint8Array): Uint8Array {
	let decompressed: Uint8Array | undefined;

	// biome-ignore lint/suspicious/noAssignInExpressions: TODO verify why this is OK
	new Decompress((chunk) => (decompressed = chunk)).push(
		fileContent,
		/* final */ true,
	);

	if (decompressed === undefined) {
		throw new Error("Failed to decompress file.");
	}
	return decompressed;
}

/**
 * Extracts files from a tarball.
 *
 * @param fileContent - The contents of the tarball as a Uint8Array. The contents is assumed to not be compressed.
 * @param destination - If provided, the contents of the tarball will be extracted to this directory. If this path does
 * not exist an exception will be thrown.
 * @returns Metadata about the tarball contents, including the file contents itself.
 */
export async function extractTarball(
	fileContent: Uint8Array,
	destination?: string,
): Promise<TarLocalFile[]> {
	const fileType = await fileTypeFromBuffer(fileContent);
	if (fileType?.ext !== "tar") {
		console.warn("Didn't identify the file as a tarball.");
		if (fileType === undefined) {
			console.warn("Couldn't identify a file type.");
		} else {
			console.warn(
				`Identified a ${fileType.ext} file, mime-type: ${fileType.mime}.`,
			);
		}
	}
	const data = untar(fileContent);

	if (destination !== undefined) {
		if (!existsSync(destination)) {
			throw new Error(`Path does not exist: ${destination}`);
		}

		if (statSync(destination).isFile()) {
			throw new Error(
				`Destination path is a file that already exists: ${destination}`,
			);
		}

		const filesP: Promise<void>[] = [];
		for (const tarfile of data) {
			const outPath = path.join(destination, tarfile.name);
			ensureDirSync(path.dirname(outPath));
			filesP.push(writeFile(outPath, tarfile.fileData));
		}
		await Promise.all(filesP);
	}
	return data;
}
