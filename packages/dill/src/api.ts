import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseContentDisposition } from "@tinyhttp/content-disposition";
import { Decompress } from "fflate";
import { fileTypeFromBuffer } from "file-type";
import { mkdirp } from "fs-extra/esm";
import mime from "mime";
// import fetch from "node-fetch-native";
import type { SetOptional } from "type-fest";
import type { TarLocalFile } from "untar.js";
import { untar } from "untar.js";

const fileProtocol = "file://";

export const KNOWN_ARCHIVE_EXTENSIONS: ReadonlySet<string> = new Set([
	"tar",
	"gz",
]);

export const UNSUPPORTED_ARCHIVE_EXTENSIONS: ReadonlySet<string> = new Set([
	"7z",
	"bz2",
	"rar",
	"zip",
	"xz",
]);

/**
 * The default name to use for the downloaded file. This is only used if the name is not provided by the caller or
 * cannot be determined from the fetch response.
 */
const defaultDownloadName = "dill-download";

/**
 * Options used to control dill's behavior.
 *
 * @public
 */
export interface DillOptions {
	/**
	 * If set to `true`, try extracting the file using [`fflate`](https://www.npmjs.com/package/fflate).
	 *
	 * @defaultValue `false`
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
	 *
	 * @defaultValue `false`
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
 * A response returned by the `download` function.
 */
export interface DownloadResponse {
	/**
	 * The raw file data.
	 */
	data: Uint8Array;

	/**
	 * The path that the downloaded file(s) were written to.
	 */
	writtenTo: string | undefined;
}

/**
 *	Downloads a file from a URL.
 *
 * @param url - The URL to download.
 * @param options - Options to use.
 *
 * @public
 */
export const download = async (
	url: URL | string,
	options?: DillOptions,
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO
): Promise<DownloadResponse> => {
	const {
		extract,
		downloadDir,
		filename: providedFilename,
		noFile,
	} = resolveOptions(options);

	// The downloadDir must exist and be a directory.
	const pathStats = await stat(downloadDir);
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

	if (extract && UNSUPPORTED_ARCHIVE_EXTENSIONS.has(extension)) {
		throw new Error(`Can't decompress files of type: ${extension}`);
	}

	const decompressed =
		extract && KNOWN_ARCHIVE_EXTENSIONS.has(extension)
			? decompress(file)
			: file;

	let writtenTo: string | undefined;
	if (extract) {
		writtenTo = noFile ? undefined : downloadDir;
		await extractTarball(decompressed, writtenTo);
	} else if (!noFile) {
		writtenTo = path.join(downloadDir, filename);
		await writeFile(writtenTo, decompressed);
	}
	return { data: decompressed, writtenTo };
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
	const contentDispositionHeader = response?.headers.get("Content-Disposition");
	const contentDisposition =
		contentDispositionHeader === undefined || contentDispositionHeader === null
			? undefined
			: parseContentDisposition(contentDispositionHeader);

	const contentDispositionFilename = contentDisposition?.parameters
		.filename as string;
	const urlType = mime.getType(url);
	const mimeType =
		urlType ??
		contentType ??
		// Try to get the mime type from the content-disposition filename as a last resort
		mime.getType(contentDispositionFilename) ??
		null;

	if (mimeType === null) {
		throw new Error(`Can't find mime type for URL: ${url}`);
	}

	const extension = mime.getExtension(mimeType);
	return {
		mimeType,
		extension,
		filename: contentDispositionFilename,
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
	fileUrl: URL | string,
): Promise<{ contents: Uint8Array; response?: Response }> {
	if (typeof fileUrl === "string" && fileUrl.startsWith(fileProtocol)) {
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
			throw new Error("Couldn't identify a file type.");
		}
		if (UNSUPPORTED_ARCHIVE_EXTENSIONS.has(fileType.ext)) {
			throw new Error(`Unsupported filetype: ${fileType.ext}.`);
		}
	}
	const data = untar(fileContent);

	if (destination !== undefined) {
		const stats = await stat(destination);
		if (stats.isFile()) {
			throw new Error(
				`Destination path is a file that already exists: ${destination}`,
			);
		}

		const filesP: Promise<void>[] = [];
		for (const tarfile of data) {
			const outPath = path.join(destination, tarfile.name);
			await mkdirp(path.dirname(outPath));
			filesP.push(writeFile(outPath, tarfile.fileData));
		}
		await Promise.all(filesP);
	}
	return data;
}
