import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { download } from "dill-cli";
import { join } from "pathe";

const GITHUB_API_BASE = "https://api.github.com";
const REPO_OWNER = "tylerbutler";
const REPO_NAME = "ccl-test-data";

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
			// biome-ignore lint/suspicious/noConsole: Intentional CLI output
			console.log(`Test data already at version ${release.tag_name}`);
			return {
				version: release.tag_name,
				filesDownloaded: 0,
				outputDir,
			};
		}
	}

	// Find the generated tests zip file
	const zipAsset = release.assets.find(
		(asset) => asset.name.includes("generated") && asset.name.endsWith(".zip"),
	);

	if (zipAsset) {
		// Download and extract the zip file using dill
		// biome-ignore lint/suspicious/noConsole: Intentional CLI output
		console.log(
			`Downloading ${zipAsset.name} from release ${release.tag_name}...`,
		);

		// Use a temporary directory for extraction
		const tempDir = join(outputDir, ".temp-extract");
		await mkdir(tempDir, { recursive: true });

		await download(zipAsset.browser_download_url, {
			downloadDir: tempDir,
			extract: true,
		});

		// Move extracted JSON files to the output directory
		const files = readdirSync(tempDir);
		let filesDownloaded = 0;
		for (const file of files) {
			if (file.endsWith(".json")) {
				const srcPath = join(tempDir, file);
				const destPath = join(outputDir, file);
				await rename(srcPath, destPath);
				filesDownloaded++;
			}
		}

		// Clean up temp directory
		await rm(tempDir, { recursive: true, force: true });

		// Write version marker
		await writeFile(versionFile, release.tag_name);

		// biome-ignore lint/suspicious/noConsole: Intentional CLI output
		console.log(`Extracted ${filesDownloaded} test files to ${outputDir}`);

		return {
			version: release.tag_name,
			filesDownloaded,
			outputDir,
		};
	}

	// Fallback: download individual JSON files using dill
	const jsonAssets = release.assets.filter(
		(asset) =>
			asset.name.endsWith(".json") &&
			!asset.name.includes("zip") &&
			asset.name !== "SHA256SUMS",
	);

	// biome-ignore lint/suspicious/noConsole: Intentional CLI output
	console.log(
		`Downloading ${jsonAssets.length} test files from release ${release.tag_name}...`,
	);

	let filesDownloaded = 0;
	for (const asset of jsonAssets) {
		// biome-ignore lint/suspicious/noConsole: Intentional CLI output
		console.log(`  Downloading ${asset.name}...`);
		await download(asset.browser_download_url, {
			downloadDir: outputDir,
			filename: asset.name,
		});
		filesDownloaded++;
	}

	// Write version marker
	await writeFile(versionFile, release.tag_name);

	// biome-ignore lint/suspicious/noConsole: Intentional CLI output
	console.log(`Downloaded ${filesDownloaded} files to ${outputDir}`);

	return {
		version: release.tag_name,
		filesDownloaded,
		outputDir,
	};
}

/**
 * Get the default test data directory path.
 */
export function getDefaultTestDataPath(): string {
	return join(process.cwd(), ".test-data");
}

/**
 * Download the JSON schema from the ccl-test-data release.
 */
export async function downloadSchema(outputDir: string): Promise<void> {
	const release = await getLatestRelease();

	// Schema is included in the release as a direct file in the repo
	// We fetch it from the release tag
	const schemaUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${release.tag_name}/schemas/generated-format.json`;

	// biome-ignore lint/suspicious/noConsole: Intentional CLI output
	console.log(`Downloading schema from release ${release.tag_name}...`);

	await mkdir(outputDir, { recursive: true });
	await download(schemaUrl, {
		downloadDir: outputDir,
		filename: "generated-format.json",
	});

	// biome-ignore lint/suspicious/noConsole: Intentional CLI output
	console.log(`Schema downloaded to ${outputDir}/generated-format.json`);
}

// Run as script if executed directly
const scriptPath = new URL(import.meta.url).pathname;
if (process.argv[1] === scriptPath) {
	const command = process.argv[2];

	if (command === "schema") {
		const outputDir = process.argv[3] || join(process.cwd(), "schemas");
		downloadSchema(outputDir)
			.then(() => {
				// biome-ignore lint/suspicious/noConsole: Intentional CLI output
				console.log("Schema download complete");
			})
			.catch((error) => {
				// biome-ignore lint/suspicious/noConsole: Intentional CLI error output
				console.error("Schema download failed:", error);
				process.exit(1);
			});
	} else {
		const force = process.argv.includes("--force");
		// Filter out flags from args
		const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
		const outputDir = args[0] || getDefaultTestDataPath();

		downloadTestData({ outputDir, force })
			.then((result) => {
				// biome-ignore lint/suspicious/noConsole: Intentional CLI output
				console.log("\nDownload complete:");
				// biome-ignore lint/suspicious/noConsole: Intentional CLI output
				console.log(`  Version: ${result.version}`);
				// biome-ignore lint/suspicious/noConsole: Intentional CLI output
				console.log(`  Files: ${result.filesDownloaded}`);
				// biome-ignore lint/suspicious/noConsole: Intentional CLI output
				console.log(`  Path: ${result.outputDir}`);
			})
			.catch((error) => {
				// biome-ignore lint/suspicious/noConsole: Intentional CLI error output
				console.error("Download failed:", error);
				process.exit(1);
			});
	}
}
