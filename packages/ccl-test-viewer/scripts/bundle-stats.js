#!/usr/bin/env node

/**
 * Simple Bundle Statistics for CCL Test Viewer
 * Analyzes build output and provides basic performance metrics.
 */

import { existsSync, readdirSync, statSync } from "fs";
import { extname, join } from "path";

const BUILD_DIR = "./build";
const STATIC_DATA_DIR = "./static/data";

/**
 * Calculate directory size recursively
 */
function getDirectorySize(dirPath) {
	let totalSize = 0;

	try {
		const items = readdirSync(dirPath);

		for (const item of items) {
			const itemPath = join(dirPath, item);
			const stats = statSync(itemPath);

			if (stats.isDirectory()) {
				totalSize += getDirectorySize(itemPath);
			} else {
				totalSize += stats.size;
			}
		}
	} catch (error) {
		console.warn(`⚠️  Could not read directory ${dirPath}:`, error.message);
	}

	return totalSize;
}

/**
 * Analyze build output structure
 */
function analyzeBuildOutput() {
	if (!existsSync(BUILD_DIR)) {
		console.error("❌ Build directory not found. Run `npm run build` first.");
		return null;
	}

	const stats = {
		totalSize: getDirectorySize(BUILD_DIR),
		assets: {
			js: 0,
			css: 0,
			html: 0,
			static: 0,
			other: 0,
		},
		files: 0,
		directories: 0,
	};

	function analyzeDirectory(dirPath, relativePath = "") {
		const items = readdirSync(dirPath);

		for (const item of items) {
			const itemPath = join(dirPath, item);
			const itemStats = statSync(itemPath);

			if (itemStats.isDirectory()) {
				stats.directories++;
				analyzeDirectory(itemPath, join(relativePath, item));
			} else {
				stats.files++;
				const ext = extname(item).toLowerCase();
				const size = itemStats.size;

				switch (ext) {
					case ".js":
					case ".mjs":
						stats.assets.js += size;
						break;
					case ".css":
						stats.assets.css += size;
						break;
					case ".html":
						stats.assets.html += size;
						break;
					case ".json":
					case ".png":
					case ".jpg":
					case ".jpeg":
					case ".gif":
					case ".svg":
					case ".ico":
						stats.assets.static += size;
						break;
					default:
						stats.assets.other += size;
				}
			}
		}
	}

	analyzeDirectory(BUILD_DIR);
	return stats;
}

/**
 * Analyze static data files
 */
function analyzeStaticData() {
	if (!existsSync(STATIC_DATA_DIR)) {
		return { totalSize: 0, files: {} };
	}

	const stats = { totalSize: 0, files: {} };
	const files = readdirSync(STATIC_DATA_DIR);

	for (const file of files) {
		if (extname(file) === ".json") {
			const filePath = join(STATIC_DATA_DIR, file);
			const size = statSync(filePath).size;
			stats.files[file] = size;
			stats.totalSize += size;
		}
	}

	return stats;
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes, decimals = 2) {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["B", "KB", "MB", "GB"];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Calculate compression ratio
 */
function getCompressionRatio(original, compressed) {
	if (original === 0) return 0;
	return (((original - compressed) / original) * 100).toFixed(1);
}

/**
 * Main analysis function
 */
function main() {
	console.log("📊 CCL Test Viewer Bundle Analysis\n");

	const buildStats = analyzeBuildOutput();
	const staticData = analyzeStaticData();

	if (!buildStats) {
		process.exit(1);
	}

	console.log("🏗️  Build Output:");
	console.log(`   Total Size: ${formatBytes(buildStats.totalSize)}`);
	console.log(`   Files: ${buildStats.files}`);
	console.log("");

	console.log("📦 Asset Breakdown:");
	console.log(`   JavaScript: ${formatBytes(buildStats.assets.js)}`);
	console.log(`   CSS: ${formatBytes(buildStats.assets.css)}`);
	console.log(`   HTML: ${formatBytes(buildStats.assets.html)}`);
	console.log(`   Static: ${formatBytes(buildStats.assets.static)}`);
	console.log("");

	if (staticData.totalSize > 0) {
		console.log("📋 CCL Test Data:");
		console.log(`   Total: ${formatBytes(staticData.totalSize)}`);
		console.log("");
	}

	console.log("🚀 Performance Tools:");
	console.log("   • npm run perf:bundle - Sonda bundle analysis");
	console.log("   • npm run perf:lighthouse - Lighthouse audit");
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
