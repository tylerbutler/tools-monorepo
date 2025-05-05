import type { SetOptional } from "type-fest";

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
	 * The directory to download the file. If undefined, uses the current working directory.
	 * Must be an existing directory if provided.
	 * @defaultValue current working directory
	 */
	downloadDir?: string;

	/**
	 * The filename to download the file to, including extensions.
	 * If not provided, uses Content-Disposition header or `dill-download.<EXTENSION>`.
	 */
	filename?: string | undefined;

	/**
	 * If true, the file will not be saved to the file system.
	 * Useful for testing or programmatic use.
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

export interface DownloadResponse {
	/** The raw file data */
	data: Uint8Array;
	/** The path where the file(s) were written, if any */
	writtenTo: string | undefined;
}

export interface FileInfo {
	filename: string;
	extension: string;
}

export interface MimeInfo {
	mimeType: string;
	extension: string | null;
	filename: string | undefined;
}
