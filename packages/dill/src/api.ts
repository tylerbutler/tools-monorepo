import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { parse as parseContentDisposition } from "@tinyhttp/content-disposition";
import { Decompress, type Unzipped, unzipSync } from "fflate";
import { fileTypeFromBuffer } from "file-type";
import mime from "mime";
import { type ParsedTarFileItem, parseTar } from "nanotar";
import path from "pathe";
import type { SetOptional } from "type-fest";

const fileProtocol = "file://";

export const KNOWN_ARCHIVE_EXTENSIONS: ReadonlySet<string> = new Set([
	"tar",
	"gz",
	"zip",
]);

export const UNSUPPORTED_ARCHIVE_EXTENSIONS: ReadonlySet<string> = new Set([
	"7z",
	"bz2",
	"rar",
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
	 *
	 * @defaultValue current working directory
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
	 * but it will otherwise not be saved. This is useful for testing or when using dill programatically.
	 *
	 * @defaultValue `false`
	 */
	noFile?: boolean;
}

/**
 * Resolved options type. All the options become required when resolved except for filename.
 */
export type DillOptionsResolved = SetOptional<
	Required<DillOptions>,
	"filename"
>;

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
 *	Downloads a file from a URL. By default, the file will be downloaded to the current directory, and will not be
 *	decompressed. These options are configurable by passing a {@link DillOptions} object.
 *
 * @param url - The URL to download.
 * @param options - Options to use. See {@link DillOptions}.
 *
 * @returns A {@link DownloadResponse} which includes the downloaded data and the file path to the downloaded file, if
 * the file was saved.
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

	if (!extract) {
		// we're not extracting, so just save the bytes
		const outputPath = path.join(downloadDir, filename);
		if (noFile) {
			return { data: file, writtenTo: undefined };
		}
		await writeUint8ArrayToFile(file, outputPath);
		return { data: file, writtenTo: outputPath };
	}

	// Extraction requested, so file needs to be decompressed.
	if (extension === "gz") {
		// File is gzip, so decompress and check if the resulting file is a tar archive
		const decompressed = decompress(file);
		const fileType = await fileTypeFromBuffer(decompressed);
		if (fileType?.ext === "tar") {
			const files = await decompressTarball(file);
			await writeTarFiles(files, downloadDir);
		} else {
			await checkDestination(downloadDir);
			const extension = path.extname(filename);
			const outputPath = path.join(
				downloadDir,
				filename.slice(0, -extension.length),
			);
			await writeUint8ArrayToFile(decompressed, outputPath);
		}
	} else if (extension === "zip") {
		const files = await decompressZip(file);
		await writeZipFiles(files, downloadDir);
	}

	return { data: file, writtenTo: downloadDir };
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

/**
 * @privateRemarks
 *
 * Decompress does not seem to work with zip streams. Need to investigate.
 */
function decompress(fileContent: Uint8Array): Uint8Array {
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
 * Extracts files from a compressed or uncompressed tarball.
 *
 * @param compressed - The contents of the tarball as a Uint8Array. The contents is assumed to not be compressed.
 * @returns Metadata about the tarball contents, including the file contents itself.
 */
export async function decompressTarball(
	compressed: Uint8Array,
): Promise<ParsedTarFileItem[]> {
	const compressedFileType = await fileTypeFromBuffer(compressed);
	const decompressed =
		compressedFileType?.ext === "gz" ? decompress(compressed) : compressed;
	const fileType = await fileTypeFromBuffer(decompressed);

	if (fileType === undefined) {
		throw new Error("Couldn't identify a file type.");
	}

	if (
		fileType?.ext !== "tar" &&
		UNSUPPORTED_ARCHIVE_EXTENSIONS.has(fileType.ext)
	) {
		throw new Error(`Unsupported filetype: ${fileType.ext}.`);
	}

	const tarFiles = parseTar(decompressed);
	return tarFiles;
}

/**
 *
 * @param destination - The contents of the tarball will be extracted to this directory. If this path does
 * not exist an exception will be thrown.
 */
export async function writeTarFiles(
	tarFiles: ParsedTarFileItem[],
	destination: string,
): Promise<void> {
	await checkDestination(destination);

	const filesP: Promise<void>[] = [];
	for (const tarfile of tarFiles) {
		if (tarfile.data === undefined) {
			throw new Error("Data undefined in tarfile.");
		}
		const outPath = path.join(destination, tarfile.name);
		await mkdir(path.dirname(outPath), { recursive: true });
		filesP.push(writeFile(outPath, tarfile.data));
	}
	await Promise.all(filesP);
}

/**
 *
 * @param destination - The contents of the tarball will be extracted to this directory. If this path does
 * not exist an exception will be thrown.
 */
export async function writeZipFiles(
	zipFiles: Unzipped,
	destination: string,
): Promise<void> {
	await checkDestination(destination);

	const filesP: Promise<void>[] = [];
	for (const [zipFilePath, data] of Object.entries(zipFiles)) {
		if (data.length === 0) {
			continue;
		}
		const outPath = path.join(destination, zipFilePath);
		await mkdir(path.dirname(outPath), { recursive: true });
		filesP.push(writeFile(outPath, data));
	}
	await Promise.all(filesP);
}

/**
 * Extracts files from a compressed zip file.
 *
 * @param compressed - The contents of the tarball as a Uint8Array. The contents is assumed to not be compressed.
 * @returns Metadata about the tarball contents, including the file contents itself.
 */
export async function decompressZip(compressed: Uint8Array): Promise<Unzipped> {
	const fileType = await fileTypeFromBuffer(compressed);

	if (fileType?.ext !== "zip") {
		if (fileType === undefined) {
			throw new Error("Couldn't identify a file type.");
		}
		if (UNSUPPORTED_ARCHIVE_EXTENSIONS.has(fileType.ext)) {
			throw new Error(`Unsupported filetype: ${fileType.ext}.`);
		}
	}

	const zipFiles = unzipSync(compressed);
	return zipFiles;
}

export async function checkDestination(destination: string): Promise<boolean> {
	const stats = await stat(destination);
	if (stats.isFile()) {
		throw new Error(
			`Destination path is a file that already exists: ${destination}`,
		);
	}
	return true;
}

async function writeUint8ArrayToFile(
	stream: Uint8Array,
	path: string,
): Promise<string> {
	await writeFile(path, stream);
	return path;
}
