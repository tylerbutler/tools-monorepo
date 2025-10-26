import fs from "node:fs";
import path from "node:path";

/**
 * Supported package managers
 *
 * @beta
 */
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * Package manager metadata
 *
 * @beta
 */
export interface PackageManagerInfo {
	name: PackageManager;
	lockfile: string;
	listCommand: string;
}

/**
 * Package manager configurations
 *
 * @beta
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
 * Detects all package managers from lockfiles in the given directory
 *
 * @param directory - Directory to search for lockfiles (defaults to process.cwd())
 * @returns Array of detected package managers
 *
 * @beta
 */
export function detectAllPackageManagers(
	directory: string = process.cwd(),
): PackageManager[] {
	const found: PackageManager[] = [];
	for (const pm of DETECTION_ORDER) {
		const lockfilePath = path.join(directory, PACKAGE_MANAGERS[pm].lockfile);
		if (fs.existsSync(lockfilePath)) {
			found.push(pm);
		}
	}
	return found;
}

/**
 * Detects the package manager from a lockfile in the given directory
 *
 * @param directory - Directory to search for lockfiles (defaults to process.cwd())
 * @returns Package manager name or undefined if no lockfile found
 * @throws When multiple lockfiles are detected in the same directory
 *
 * @beta
 */
export function detectPackageManager(
	directory: string = process.cwd(),
): PackageManager | undefined {
	const found = detectAllPackageManagers(directory);
	if (found.length === 0) {
		return;
	}
	if (found.length > 1) {
		throw new Error(
			`Multiple lockfiles detected: ${found.map((pm) => PACKAGE_MANAGERS[pm].lockfile).join(", ")}. ` +
				"Please use the --lockfile flag to specify which one to use.",
		);
	}
	return found[0];
}

/**
 * Detects package manager from a specific lockfile path
 *
 * @param lockfilePath - Absolute path to lockfile
 * @returns Package manager name or null if unrecognized
 *
 * @beta
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
 *
 * @beta
 */
export function getPackageManagerInfo(pm: PackageManager): PackageManagerInfo {
	return PACKAGE_MANAGERS[pm];
}

/**
 * Gets all supported lockfile names
 *
 * @returns Array of lockfile names
 *
 * @beta
 */
export function getAllLockfiles(): string[] {
	return Object.values(PACKAGE_MANAGERS).map((pm) => pm.lockfile);
}
