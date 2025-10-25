import fs from "node:fs";
import path from "node:path";

/**
 * Supported package managers
 */
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * Package manager metadata
 */
export interface PackageManagerInfo {
	name: PackageManager;
	lockfile: string;
	listCommand: string;
}

/**
 * Package manager configurations
 */
export const PACKAGE_MANAGERS: Record<PackageManager, PackageManagerInfo> = {
	npm: {
		name: "npm",
		lockfile: "package-lock.json",
		listCommand: "npm list --json --depth 0 --workspaces --all",
	},
	pnpm: {
		name: "pnpm",
		lockfile: "pnpm-lock.yaml",
		listCommand: "pnpm list --json --depth 0 --recursive",
	},
	yarn: {
		name: "yarn",
		lockfile: "yarn.lock",
		listCommand: "yarn list --json --depth 0",
	},
	bun: {
		name: "bun",
		lockfile: "bun.lockb",
		listCommand: "bun pm ls --json",
	},
} as const;

/**
 * Lockfile detection order (most specific to least specific)
 */
const DETECTION_ORDER: PackageManager[] = ["bun", "pnpm", "yarn", "npm"];

/**
 * Detects the package manager from a lockfile in the given directory
 *
 * @param directory - Directory to search for lockfiles (defaults to process.cwd())
 * @returns Package manager name or null if no lockfile found
 */
export function detectPackageManager(
	directory: string = process.cwd(),
): PackageManager | null {
	for (const pm of DETECTION_ORDER) {
		const lockfilePath = path.join(directory, PACKAGE_MANAGERS[pm].lockfile);
		if (fs.existsSync(lockfilePath)) {
			return pm;
		}
	}
	return null;
}

/**
 * Detects package manager from a specific lockfile path
 *
 * @param lockfilePath - Absolute path to lockfile
 * @returns Package manager name or null if unrecognized
 */
export function detectFromLockfilePath(
	lockfilePath: string,
): PackageManager | null {
	const filename = path.basename(lockfilePath);
	for (const pm of Object.values(PACKAGE_MANAGERS)) {
		if (pm.lockfile === filename) {
			return pm.name;
		}
	}
	return null;
}

/**
 * Gets package manager info
 *
 * @param pm - Package manager name
 * @returns Package manager info
 */
export function getPackageManagerInfo(
	pm: PackageManager,
): PackageManagerInfo {
	return PACKAGE_MANAGERS[pm];
}

/**
 * Checks if a package manager is supported for sync operations
 *
 * @param pm - Package manager name
 * @returns True if supported, false otherwise
 */
export function isSyncSupported(pm: PackageManager): boolean {
	// Currently Yarn and Bun are not fully supported for sync
	return pm === "npm" || pm === "pnpm";
}

/**
 * Gets all supported lockfile names
 *
 * @returns Array of lockfile names
 */
export function getAllLockfiles(): string[] {
	return Object.values(PACKAGE_MANAGERS).map((pm) => pm.lockfile);
}
