import { statSync } from "node:fs";
import path from "pathe";
import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition, PolicyFailure } from "../policy.js";

/**
 * Policy settings for the NoLargeBinaryFiles repo policy.
 *
 * @alpha
 */
export interface NoLargeBinaryFilesSettings {
	/**
	 * Maximum file size in bytes. Defaults to 10MB.
	 */
	maxSizeBytes?: number;

	/**
	 * File extensions to exclude from size checking.
	 * Useful for known large files that should be allowed.
	 */
	excludeExtensions?: string[];

	/**
	 * File patterns to exclude from size checking.
	 * Uses glob-style patterns.
	 */
	excludePatterns?: string[];
}

/**
 * Default maximum file size (10MB in bytes).
 */
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

/**
 * Default file extensions that are typically safe to exclude from size limits.
 */
const DEFAULT_EXCLUDE_EXTENSIONS = [
	".md",
	".txt",
	".json",
	".js",
	".ts",
	".jsx",
	".tsx",
	".css",
	".scss",
	".sass",
	".less",
	".html",
	".xml",
	".yml",
	".yaml",
	".toml",
	".ini",
	".conf",
	".config",
];

/**
 * Convert a glob pattern to a regex pattern by escaping special characters
 * and converting * to .* for wildcard matching.
 */
function globToRegex(pattern: string): RegExp {
	// Escape all regex special characters except *
	const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
	// Convert * to .* for wildcard matching
	const regexPattern = escaped.replace(/\*/g, ".*");
	return new RegExp(`^${regexPattern}$`);
}

/**
 * Check if a file matches any of the exclude patterns.
 */
function isExcluded(
	filePath: string,
	excludePatterns: string[],
	excludeExtensions: string[],
): boolean {
	const ext = path.extname(filePath).toLowerCase();

	// Check extensions
	if (excludeExtensions.includes(ext)) {
		return true;
	}

	// Check patterns (simple glob-like matching)
	for (const pattern of excludePatterns) {
		if (pattern.includes("*")) {
			const regex = globToRegex(pattern);
			if (regex.test(filePath)) {
				return true;
			}
		} else if (filePath.includes(pattern)) {
			return true;
		}
	}

	return false;
}

/**
 * Format bytes in a human-readable format.
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) {
		return "0 B";
	}
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.min(
		Math.floor(Math.log(bytes) / Math.log(k)),
		sizes.length - 1,
	);
	const formatted = (bytes / k ** i).toFixed(1);
	return `${formatted} ${sizes[i]}`;
}

/**
 * A repo policy that prevents large binary files from being committed to the repository.
 * Large files can bloat the repository and slow down clones. Consider using Git LFS for large assets.
 *
 * @alpha
 */
export const NoLargeBinaryFiles: PolicyDefinition<NoLargeBinaryFilesSettings> =
	makePolicyDefinition(
		"NoLargeBinaryFiles",
		// Match all files
		/.*/,
		async ({ file, root, config }) => {
			const maxSizeBytes = config?.maxSizeBytes ?? DEFAULT_MAX_SIZE;
			const excludeExtensions =
				config?.excludeExtensions ?? DEFAULT_EXCLUDE_EXTENSIONS;
			const excludePatterns = config?.excludePatterns ?? [];

			// Skip excluded files
			if (isExcluded(file, excludePatterns, excludeExtensions)) {
				return true;
			}

			try {
				const filePath = path.resolve(root, file);
				const stats = statSync(filePath);

				// Skip directories
				if (stats.isDirectory()) {
					return true;
				}

				if (stats.size > maxSizeBytes) {
					const result: PolicyFailure = {
						name: NoLargeBinaryFiles.name,
						file,
						autoFixable: false,
						errorMessages: [
							`File is too large: ${formatBytes(stats.size)} (max: ${formatBytes(maxSizeBytes)}). Consider using Git LFS or removing the file.`,
						],
					};

					return result;
				}

				return true;
			} catch (_error: unknown) {
				// File doesn't exist or can't be accessed, skip it
				return true;
			}
		},
	);
