/**
 * Postinstall script for repopo - downloads pre-built repopo-core binary.
 *
 * This script uses only Node.js built-ins (no workspace dependencies).
 * It gracefully handles all errors — a missing binary is not fatal since
 * the Rust engine is optional.
 */

import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, chmodSync, unlinkSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");

// Skip in source checkout (development)
if (existsSync(join(packageRoot, "crates", "core", "Cargo.toml"))) {
	console.log("repopo: source checkout detected, skipping binary download.");
	process.exit(0);
}

// Skip if explicitly disabled
// biome-ignore lint/style/noProcessEnv: Postinstall environment check
if (process.env.REPOPO_SKIP_POSTINSTALL === "1") {
	console.log("repopo: REPOPO_SKIP_POSTINSTALL=1, skipping binary download.");
	process.exit(0);
}

const PLATFORM_MAP = {
	"linux-x64": "repopo-core-linux-x64",
	"linux-arm64": "repopo-core-linux-arm64",
	"darwin-x64": "repopo-core-darwin-x64",
	"darwin-arm64": "repopo-core-darwin-arm64",
	"win32-x64": "repopo-core-win32-x64",
};

const platformKey = `${process.platform}-${process.arch}`;
const assetName = PLATFORM_MAP[platformKey];

if (!assetName) {
	console.warn(`repopo: unsupported platform ${platformKey}, skipping binary download.`);
	process.exit(0);
}

try {
	const pkg = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf-8"));
	const version = pkg.version;
	const isWindows = process.platform === "win32";
	const ext = isWindows ? ".zip" : ".tar.gz";
	const binaryName = isWindows ? "repopo-core.exe" : "repopo-core";
	const baseUrl = `https://github.com/tylerbutler/tools-monorepo/releases/download/repopo-core-v${version}`;
	const archiveUrl = `${baseUrl}/${assetName}${ext}`;
	const checksumUrl = `${archiveUrl}.sha256`;

	const nativeDir = join(packageRoot, "native");
	const binaryDest = join(nativeDir, binaryName);

	// Skip if binary already exists
	if (existsSync(binaryDest)) {
		console.log("repopo: binary already exists, skipping download.");
		process.exit(0);
	}

	mkdirSync(nativeDir, { recursive: true });

	console.log(`repopo: downloading ${assetName}${ext}...`);

	// Download checksum
	const checksumText = await fetchText(checksumUrl);
	const expectedHash = checksumText.trim().split(/\s+/)[0];

	// Download archive
	const archivePath = join(nativeDir, `${assetName}${ext}`);
	await downloadFile(archiveUrl, archivePath);

	// Verify checksum
	const fileBuffer = await readFile(archivePath);
	const actualHash = createHash("sha256").update(fileBuffer).digest("hex");

	if (actualHash !== expectedHash) {
		unlinkSync(archivePath);
		throw new Error(`Checksum mismatch: expected ${expectedHash}, got ${actualHash}`);
	}

	// Extract — uses execFileSync with explicit argument arrays to avoid shell injection
	if (isWindows) {
		execFileSync("powershell", [
			"-Command",
			`Expand-Archive -Path '${archivePath}' -DestinationPath '${nativeDir}' -Force`,
		], { stdio: "pipe" });
	} else {
		execFileSync("tar", ["xzf", archivePath, "-C", nativeDir], { stdio: "pipe" });
	}

	// Clean up archive
	unlinkSync(archivePath);

	// Set executable permission (non-Windows)
	if (!isWindows) {
		chmodSync(binaryDest, 0o755);
	}

	console.log("repopo: binary installed successfully.");
} catch (err) {
	console.warn(`repopo: failed to download binary (${err.message}). The Rust engine will be unavailable.`);
	process.exit(0);
}

/**
 * Fetch text content from a URL using Node.js built-in fetch.
 */
async function fetchText(url) {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`HTTP ${res.status} fetching ${url}`);
	}
	return res.text();
}

/**
 * Download a file from a URL to a local path using Node.js built-in fetch.
 */
async function downloadFile(url, dest) {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`HTTP ${res.status} fetching ${url}`);
	}
	const fileStream = createWriteStream(dest);
	await pipeline(res.body, fileStream);
}
