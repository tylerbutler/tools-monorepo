#!/usr/bin/env node
/**
 * CLI tool to download CCL test data from GitHub releases.
 *
 * @example
 * ```bash
 * # Download to default location (./ccl-test-data)
 * npx ccl-download-tests
 *
 * # Download to custom location
 * npx ccl-download-tests --output ./my-test-data
 *
 * # Force re-download even if up to date
 * npx ccl-download-tests --force
 *
 * # Download specific version
 * npx ccl-download-tests --version v1.0.0
 *
 * # Download JSON schema only
 * npx ccl-download-tests schema --output ./schemas
 * ```
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { defineCommand, runMain } from "citty";
import consola from "consola";
import { download } from "dill-cli";
import { join } from "pathe";

const GITHUB_API_BASE = "https://api.github.com";
const REPO_OWNER = "tylerbutler";
const REPO_NAME = "ccl-test-data";

/** Default output directory for downloaded test data */
const DEFAULT_OUTPUT_DIR = "./ccl-test-data";

/**
 * GitHub release asset information.
 */
interface ReleaseAsset {
	name: string;
	browser_download_url: string;
	size: number;
}

/**
 * GitHub release information.
 */
interface Release {
	tag_name: string;
	name: string;
	published_at: string;
	assets: ReleaseAsset[];
}

/**
 * Options for downloading test data.
 */
export interface DownloadOptions {
	/** Target directory for downloaded files */
	outputDir: string;
	/** Force download even if files exist */
	force?: boolean;
	/** Specific version tag to download (default: latest) */
	version?: string;
}

/**
 * Result of the download operation.
 */
export interface DownloadResult {
	/** Version tag that was downloaded */
	version: string;
	/** Number of files downloaded */
	filesDownloaded: number;
	/** Path to the downloaded files */
	outputDir: string;
}

/**
 * Get the latest release information from GitHub.
 */
async function getLatestRelease(): Promise<Release> {
	const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
	const response = await fetch(url, {
		headers: {
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "ccl-test-runner-ts",
		},
	});

	if (!response.ok) {
		throw new Error(
			`Failed to fetch latest release: ${response.status} ${response.statusText}`,
		);
	}

	return response.json() as Promise<Release>;
}

/**
 * Get a specific release by tag from GitHub.
 */
async function getReleaseByTag(tag: string): Promise<Release> {
	const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${tag}`;
	const response = await fetch(url, {
		headers: {
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "ccl-test-runner-ts",
		},
	});

	if (!response.ok) {
		throw new Error(
			`Failed to fetch release ${tag}: ${response.status} ${response.statusText}`,
		);
	}

	return response.json() as Promise<Release>;
}

/**
 * Download test data from the ccl-test-data GitHub releases.
 *
 * This function downloads the generated test zip file from the
 * specified release (or latest if not specified) and extracts it using dill.
 */
export async function downloadTestData(
	options: DownloadOptions,
): Promise<DownloadResult> {
	const { outputDir, force = false, version } = options;

	// Get release info
	const release = version
		? await getReleaseByTag(version)
		: await getLatestRelease();

	// Create output directory
	await mkdir(outputDir, { recursive: true });

	// Check if we have a version marker file
	const versionFile = join(outputDir, ".version");
	if (!force && existsSync(versionFile)) {
		const existingVersion = await readFile(versionFile, "utf-8");
		if (existingVersion.trim() === release.tag_name) {
			consola.info(`Test data already at version ${release.tag_name}`);
			return {
				version: release.tag_name,
				filesDownloaded: 0,
				outputDir,
			};
		}
	}

	// Download individual JSON files using dill
	const jsonAssets = release.assets.filter(
		(asset) =>
			asset.name.endsWith(".json") &&
			!asset.name.includes("zip") &&
			asset.name !== "SHA256SUMS",
	);

	consola.start(
		`Downloading ${jsonAssets.length} test files from release ${release.tag_name}...`,
	);

	let filesDownloaded = 0;
	for (const asset of jsonAssets) {
		consola.info(`  Downloading ${asset.name}...`);
		await download(asset.browser_download_url, {
			downloadDir: outputDir,
			filename: asset.name,
		});
		filesDownloaded++;
	}

	// Write version marker
	await writeFile(versionFile, release.tag_name);

	consola.success(`Downloaded ${filesDownloaded} files to ${outputDir}`);

	return {
		version: release.tag_name,
		filesDownloaded,
		outputDir,
	};
}

/**
 * Download the JSON schema from the ccl-test-data release.
 */
export async function downloadSchema(outputDir: string): Promise<void> {
	const release = await getLatestRelease();

	// Schema is included in the release as a direct file in the repo
	// We fetch it from the release tag
	const schemaUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${release.tag_name}/schemas/generated-format.json`;

	consola.start(`Downloading schema from release ${release.tag_name}...`);

	await mkdir(outputDir, { recursive: true });
	await download(schemaUrl, {
		downloadDir: outputDir,
		filename: "generated-format.json",
	});

	consola.success(`Schema downloaded to ${outputDir}/generated-format.json`);
}

// Schema subcommand
const schemaCommand = defineCommand({
	meta: {
		name: "schema",
		description: "Download the CCL test data JSON schema",
	},
	args: {
		output: {
			type: "string",
			alias: "o",
			description: "Output directory for schema file",
			default: "./schemas",
		},
	},
	async run({ args }) {
		await downloadSchema(args.output);
	},
});

// Main command
const main = defineCommand({
	meta: {
		name: "ccl-download-tests",
		version: "0.1.0",
		description: "Download CCL test data from GitHub releases",
	},
	args: {
		output: {
			type: "string",
			alias: "o",
			description: "Output directory for test data",
			default: DEFAULT_OUTPUT_DIR,
		},
		force: {
			type: "boolean",
			alias: "f",
			description: "Force download even if already up to date",
			default: false,
		},
		version: {
			type: "string",
			alias: "v",
			description: "Specific version tag to download (default: latest)",
		},
	},
	subCommands: {
		schema: schemaCommand,
	},
	async run({ args }) {
		const result = await downloadTestData({
			outputDir: args.output,
			force: args.force,
			version: args.version,
		});

		consola.box(
			`Version: ${result.version}\nFiles: ${result.filesDownloaded}\nPath: ${result.outputDir}`,
		);
	},
});

// Run CLI
runMain(main).catch((error: unknown) => {
	consola.error(error);
	process.exit(1);
});
