/**
 * A command-line and programmatic API for downloading and decompressing .tar.gz files.
 *
 * @remarks
 * Dill provides a simple way to download gzipped tar files and optionally decompress their contents.
 * It can be used as a CLI tool or integrated into other applications as a library.
 *
 * @packageDocumentation
 */

// API
export { download } from "./api.js";
export type { DillOptions, DownloadResponse } from "./types.js";

// oclif-required export
export { run } from "@oclif/core";
