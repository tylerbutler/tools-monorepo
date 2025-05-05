import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { parse as parseContentDisposition } from "@tinyhttp/content-disposition";
import { Decompress, type Unzipped, unzipSync } from "fflate";
import { fileTypeFromBuffer } from "file-type";
import mime from "mime";
import { type ParsedTarFileItem, parseTar } from "nanotar";
import path from "pathe";
import type {
	DillOptions,
	DillOptionsResolved,
	DownloadResponse,
	FileInfo,
	MimeInfo,
} from "./types.js";

// Constants
const fileProtocol = "file://";

/**
 * The default name to use for the downloaded file. This is only used if the name is not provided by the caller or
 * cannot be determined from the fetch response.
 */
const defaultDownloadName = "dill-download";

/**
 * Known file extensions for compressed archives that dill can decompress.
 */
export const KNOWN_ARCHIVE_EXTENSIONS: ReadonlySet<string> = new Set([
	"tar",
	"gz",
	"zip",
]);

/**
 * Known file extensions for compressed archives that dill does not support.
 */
export const UNSUPPORTED_ARCHIVE_EXTENSIONS: ReadonlySet<string> = new Set([
	"7z",
	"bz2",
	"rar",
	"xz",
]);

// Utility functions
function resolveOptions(options?: DillOptions): Readonly<DillOptionsResolved> {
	return {
		extract: options?.extract ?? false,
		downloadDir: options?.downloadDir ?? process.cwd(),
		filename: options?.filename,
		noFile: options?.noFile ?? false,
	};
}

async function readFileIntoUint8Array(filePath: string): Promise<Uint8Array> {
	const buffer = await readFile(filePath);
	return new Uint8Array(buffer.buffer);
}

function getMimeType(response: Response): MimeInfo {
	const { url } = response;
	const contentType = response.headers.get("Content-Type");
	const contentDispositionHeader = response.headers.get("Content-Disposition");
	const contentDisposition = contentDispositionHeader
		? parseContentDisposition(contentDispositionHeader)
		: undefined;

	const contentDispositionFilename = contentDisposition?.parameters
		.filename as string;
	const urlType = mime.getType(url);
	const mimeType =
		urlType ?? contentType ?? mime.getType(contentDispositionFilename) ?? null;

	if (mimeType === null) {
		throw new Error(`Can't find mime type for URL: ${url}`);
	}

	return {
		mimeType,
		extension: mime.getExtension(mimeType),
		filename: contentDispositionFilename,
	};
}

function decompress(fileContent: Uint8Array): Uint8Array {
	let decompressed: Uint8Array | undefined;
	const decompressor = new Decompress((chunk) => {
		decompressed = chunk;
	});
	decompressor.push(fileContent, true);

	if (decompressed === undefined) {
		throw new Error("Failed to decompress file.");
	}
	return decompressed;
}

async function checkDestination(destination: string): Promise<boolean> {
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

async function determineFileInfo(
	file: Uint8Array,
	response: Response | undefined,
	url: URL | string,
	providedFilename?: string,
): Promise<FileInfo> {
	if (response === undefined) {
		const filetype = await fileTypeFromBuffer(file);
		if (filetype === undefined) {
			throw new Error(`Can't find file type for URL: ${url}`);
		}
		return {
			filename: providedFilename ?? `${defaultDownloadName}.${filetype.ext}`,
			extension: filetype.ext,
		};
	}

	const { extension, filename: responseFileName } = getMimeType(response);
	if (extension === null) {
		throw new Error(`Can't find file type for URL: ${url}`);
	}

	return {
		filename:
			providedFilename ??
			responseFileName ??
			`${defaultDownloadName}.${extension}`,
		extension,
	};
}

async function handleExtraction(
	file: Uint8Array,
	extension: string,
	downloadDir: string,
	filename: string,
): Promise<void> {
	if (extension === "gz") {
		const decompressed = decompress(file);
		const fileType = await fileTypeFromBuffer(decompressed);
		if (fileType?.ext === "tar") {
			const files = await decompressTarball(file);
			await writeTarFiles(files, downloadDir);
		} else {
			await checkDestination(downloadDir);
			const outputPath = path.join(
				downloadDir,
				filename.slice(0, -path.extname(filename).length),
			);
			await writeUint8ArrayToFile(decompressed, outputPath);
		}
	} else if (extension === "zip") {
		const files = await decompressZip(file);
		await writeZipFiles(files, downloadDir);
	}
}

/**
 * Fetches the file at the given URL and returns it as an in-memory Uint8Array.
 *
 * @param fileUrl - The URL of the file. If the URL begins with `file://`, then the path will be treated as a file
 * system path and loaded using `node:fs.readFile`.
 * @returns The file contents as a Uint8Array.
 */
async function fetchFile(
	fileUrl: URL | string,
): Promise<{ contents: Uint8Array; response?: Response }> {
	if (typeof fileUrl === "string" && fileUrl.startsWith(fileProtocol)) {
		const filePath = fileUrl.slice(fileProtocol.length);
		return { contents: await readFileIntoUint8Array(filePath) };
	}

	const response = await fetch(fileUrl);
	const contents = new Uint8Array(await response.arrayBuffer());
	return { contents, response };
}

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
		fileType.ext !== "tar" &&
		UNSUPPORTED_ARCHIVE_EXTENSIONS.has(fileType.ext)
	) {
		throw new Error(`Unsupported filetype: ${fileType.ext}.`);
	}

	return parseTar(decompressed);
}

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

	return unzipSync(compressed);
}

export const download = async (
	url: URL | string,
	options?: DillOptions,
): Promise<DownloadResponse> => {
	const {
		extract,
		downloadDir,
		filename: providedFilename,
		noFile,
	} = resolveOptions(options);

	// Validate download directory
	const pathStats = await stat(downloadDir);
	if (extract && !pathStats.isDirectory()) {
		throw new Error(`Path is not a directory: ${downloadDir}`);
	}

	// Fetch the file
	const { contents: file, response } = await fetchFile(url);

	// Determine file information
	const { filename, extension } = await determineFileInfo(
		file,
		response,
		url,
		providedFilename,
	);

	// Validate extraction support
	if (extract && UNSUPPORTED_ARCHIVE_EXTENSIONS.has(extension)) {
		throw new Error(`Can't decompress files of type: ${extension}`);
	}

	// Handle non-extraction case
	if (!extract) {
		const outputPath = path.join(downloadDir, filename);
		if (noFile) {
			return { data: file, writtenTo: undefined };
		}
		await writeUint8ArrayToFile(file, outputPath);
		return { data: file, writtenTo: outputPath };
	}

	// Handle extraction
	await handleExtraction(file, extension, downloadDir, filename);
	return { data: file, writtenTo: downloadDir };
};
