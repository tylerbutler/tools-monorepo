import {
	lstat,
	mkdir,
	open,
	readFile,
	realpath,
	stat,
	unlink,
	writeFile,
} from "node:fs/promises";
import process from "node:process";
import { parse as parseContentDisposition } from "@tinyhttp/content-disposition";
import { all, call, run } from "effection";
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
const pathSeparatorPattern = /[\\/]/u;
const windowsDrivePrefix = /^[A-Za-z]:/;

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
	const filename =
		options?.filename === undefined
			? undefined
			: path.basename(options.filename);

	const downloadDir =
		options?.downloadDir ??
		(options?.filename !== undefined
			? path.dirname(options.filename)
			: process.cwd());

	return {
		extract: options?.extract ?? false,
		downloadDir,
		filename,
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
	const chunks: Uint8Array[] = [];
	const decompressor = new Decompress((chunk) => {
		if (chunk.length > 0) {
			chunks.push(chunk);
		}
	});
	decompressor.push(fileContent, true);

	if (chunks.length === 0) {
		throw new Error("Failed to decompress file.");
	}

	const decompressedLength = chunks.reduce(
		(length, chunk) => length + chunk.length,
		0,
	);
	const decompressed = new Uint8Array(decompressedLength);
	let offset = 0;
	for (const chunk of chunks) {
		decompressed.set(chunk, offset);
		offset += chunk.length;
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

function resolveArchiveEntryPath(
	destination: string,
	entryName: string,
): string {
	const portableEntryName = entryName.replaceAll("\\", "/");
	const normalizedEntryName = path.normalize(portableEntryName);
	const extractionRoot = path.resolve(destination);
	const resolvedEntryPath = path.resolve(extractionRoot, normalizedEntryName);
	const relativeEntryPath = path.relative(extractionRoot, resolvedEntryPath);

	if (
		entryName.includes("\0") ||
		portableEntryName.startsWith("/") ||
		windowsDrivePrefix.test(portableEntryName) ||
		relativeEntryPath === "" ||
		relativeEntryPath === ".." ||
		relativeEntryPath.startsWith("../") ||
		path.isAbsolute(relativeEntryPath)
	) {
		throw new Error(`Unsafe archive entry path: ${entryName}`);
	}

	return resolvedEntryPath;
}

function hasErrorCode(error: unknown, code: string): boolean {
	return (error as NodeJS.ErrnoException).code === code;
}

function pathEscapesRoot(root: string, candidate: string): boolean {
	const relativePath = path.relative(root, candidate);
	return (
		relativePath === ".." ||
		relativePath.startsWith("../") ||
		path.isAbsolute(relativePath)
	);
}

async function prepareArchiveOutput(
	destination: string,
	entryName: string,
	outputPath: string,
): Promise<void> {
	const extractionRoot = path.resolve(destination);
	const realExtractionRoot = await realpath(extractionRoot);
	const relativeParent = path.relative(
		extractionRoot,
		path.dirname(outputPath),
	);
	let currentPath = extractionRoot;

	for (const component of relativeParent
		.split(pathSeparatorPattern)
		.filter(Boolean)) {
		currentPath = path.join(currentPath, component);
		try {
			await mkdir(currentPath);
		} catch (error) {
			if (!hasErrorCode(error, "EEXIST")) {
				throw error;
			}
		}

		const stats = await lstat(currentPath);
		if (
			stats.isSymbolicLink() ||
			!stats.isDirectory() ||
			pathEscapesRoot(realExtractionRoot, await realpath(currentPath))
		) {
			throw new Error(`Unsafe archive entry path: ${entryName}`);
		}
	}

	try {
		if ((await lstat(outputPath)).isSymbolicLink()) {
			throw new Error(`Unsafe archive entry path: ${entryName}`);
		}
	} catch (error) {
		if (!hasErrorCode(error, "ENOENT")) {
			throw error;
		}
	}
}

async function writeArchiveFile(
	stream: Uint8Array,
	filePath: string,
	entryName: string,
): Promise<void> {
	try {
		if ((await lstat(filePath)).isSymbolicLink()) {
			throw new Error(`Unsafe archive entry path: ${entryName}`);
		}
		await unlink(filePath);
	} catch (error) {
		if (!hasErrorCode(error, "ENOENT")) {
			throw error;
		}
	}

	const file = await open(filePath, "wx");
	try {
		await file.writeFile(stream);
	} finally {
		await file.close();
	}
}

async function writeUint8ArrayToFile(
	stream: Uint8Array,
	filePath: string,
): Promise<string> {
	await writeFile(filePath, stream);
	return filePath;
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
			const files = await decompressTarball(decompressed);
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
export async function fetchFile(
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
		compressedFileType?.ext === "gz" || compressedFileType?.ext === "tar.gz"
			? decompress(compressed)
			: compressed;
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
	const writes = tarFiles.map((tarfile) => {
		if (tarfile.data === undefined) {
			throw new Error("Data undefined in tarfile.");
		}

		return {
			data: tarfile.data,
			entryName: tarfile.name,
			outPath: resolveArchiveEntryPath(destination, tarfile.name),
		};
	});
	await Promise.all(
		writes.map(({ entryName, outPath }) =>
			prepareArchiveOutput(destination, entryName, outPath),
		),
	);

	// Use Effection for structured concurrency with automatic cancellation
	await run(function* () {
		// Execute all write operations concurrently
		// If any operation fails, Effection automatically cancels the rest
		yield* all(
			writes.map(({ data, entryName, outPath }) =>
				(function* () {
					yield* call(() => writeArchiveFile(data, outPath, entryName));
				})(),
			),
		);
	});
}

export async function writeZipFiles(
	zipFiles: Unzipped,
	destination: string,
): Promise<void> {
	await checkDestination(destination);
	const writes = Object.entries(zipFiles).map(([zipFilePath, data]) => ({
		data,
		entryName: zipFilePath,
		outPath: resolveArchiveEntryPath(destination, zipFilePath),
	}));
	await Promise.all(
		writes.map(({ entryName, outPath }) =>
			prepareArchiveOutput(destination, entryName, outPath),
		),
	);

	// Use Effection for structured concurrency with automatic cancellation
	await run(function* () {
		// Execute all write operations concurrently
		// If any operation fails, Effection automatically cancels the rest
		yield* all(
			writes
				.filter(({ data }) => data.length > 0)
				.map(({ data, entryName, outPath }) =>
					(function* () {
						yield* call(() => writeArchiveFile(data, outPath, entryName));
					})(),
				),
		);
	});
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
		if (!pathStats.isDirectory()) {
			throw new Error("fetch failed: Path is not a directory");
		}
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
