import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { temporaryDirectory } from "tempy";
import { beforeEach, describe, expect, it } from "vitest";
import {
	detectAllPackageManagers,
	detectFromLockfilePath,
	detectPackageManager,
	getAllLockfiles,
	getPackageManagerInfo,
	PACKAGE_MANAGERS,
	type PackageManager,
} from "../src/package-manager.js";

describe("package-manager", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = temporaryDirectory();
	});

	describe("detectAllPackageManagers", () => {
		it("detects single pnpm lockfile", async () => {
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
			expect(detectAllPackageManagers(tmpDir)).toEqual(["pnpm"]);
		});

		it("detects multiple lockfiles in order", async () => {
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
			await writeFile(join(tmpDir, "package-lock.json"), "{}");
			await writeFile(join(tmpDir, "yarn.lock"), "# yarn lockfile v1");

			// Should return in detection order: bun, pnpm, yarn, npm
			const result = detectAllPackageManagers(tmpDir);
			expect(result).toEqual(["pnpm", "yarn", "npm"]);
		});

		it("detects all four package managers", async () => {
			await writeFile(join(tmpDir, "bun.lockb"), Buffer.from([0x01]));
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
			await writeFile(join(tmpDir, "package-lock.json"), "{}");
			await writeFile(join(tmpDir, "yarn.lock"), "# yarn lockfile v1");

			const result = detectAllPackageManagers(tmpDir);
			expect(result).toEqual(["bun", "pnpm", "yarn", "npm"]);
		});

		it("returns empty array when no lockfiles found", () => {
			expect(detectAllPackageManagers(tmpDir)).toEqual([]);
		});

		it("uses process.cwd() when no directory provided", () => {
			// Should not throw and should return an array
			const result = detectAllPackageManagers();
			expect(Array.isArray(result)).toBe(true);
		});
	});

	describe("detectPackageManager", () => {
		it("detects pnpm from pnpm-lock.yaml", async () => {
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
			expect(detectPackageManager(tmpDir)).toBe("pnpm");
		});

		it("detects npm from package-lock.json", async () => {
			await writeFile(
				join(tmpDir, "package-lock.json"),
				JSON.stringify({ lockfileVersion: 3 }),
			);
			expect(detectPackageManager(tmpDir)).toBe("npm");
		});

		it("detects yarn from yarn.lock", async () => {
			await writeFile(join(tmpDir, "yarn.lock"), "# yarn lockfile v1");
			expect(detectPackageManager(tmpDir)).toBe("yarn");
		});

		it("detects bun from bun.lockb", async () => {
			await writeFile(join(tmpDir, "bun.lockb"), Buffer.from([0x01, 0x02]));
			expect(detectPackageManager(tmpDir)).toBe("bun");
		});

		it("returns undefined when no lockfile is found", () => {
			expect(detectPackageManager(tmpDir)).toBeUndefined();
		});

		it("throws error when multiple lockfiles are detected", async () => {
			// Create multiple lockfiles
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
			await writeFile(join(tmpDir, "package-lock.json"), "{}");

			expect(() => detectPackageManager(tmpDir)).toThrow(
				/Multiple lockfiles detected/,
			);
			expect(() => detectPackageManager(tmpDir)).toThrow(
				/Please use the --lockfile flag/,
			);
		});

		it("throws error for bun + other package managers", async () => {
			await writeFile(join(tmpDir, "bun.lockb"), Buffer.from([0x01]));
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");

			expect(() => detectPackageManager(tmpDir)).toThrow(
				/Multiple lockfiles detected/,
			);
		});

		it("detects single lockfile when only one exists", async () => {
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");

			expect(detectPackageManager(tmpDir)).toBe("pnpm");
		});
	});

	describe("detectFromLockfilePath", () => {
		it("detects pnpm from pnpm-lock.yaml path", () => {
			expect(detectFromLockfilePath("/path/to/pnpm-lock.yaml")).toBe("pnpm");
		});

		it("detects npm from package-lock.json path", () => {
			expect(detectFromLockfilePath("/path/to/package-lock.json")).toBe("npm");
		});

		it("detects yarn from yarn.lock path", () => {
			expect(detectFromLockfilePath("/path/to/yarn.lock")).toBe("yarn");
		});

		it("detects bun from bun.lockb path", () => {
			expect(detectFromLockfilePath("/path/to/bun.lockb")).toBe("bun");
		});

		it("returns null for unrecognized lockfile", () => {
			expect(detectFromLockfilePath("/path/to/unknown.lock")).toBeNull();
		});

		it("handles relative paths", () => {
			expect(detectFromLockfilePath("./pnpm-lock.yaml")).toBe("pnpm");
		});
	});

	describe("getPackageManagerInfo", () => {
		it("returns correct info for npm", () => {
			const info = getPackageManagerInfo("npm");
			expect(info.name).toBe("npm");
			expect(info.lockfile).toBe("package-lock.json");
			expect(info.listCommand).toContain("npm list");
		});

		it("returns correct info for pnpm", () => {
			const info = getPackageManagerInfo("pnpm");
			expect(info.name).toBe("pnpm");
			expect(info.lockfile).toBe("pnpm-lock.yaml");
			expect(info.listCommand).toContain("pnpm list");
		});

		it("returns correct info for yarn", () => {
			const info = getPackageManagerInfo("yarn");
			expect(info.name).toBe("yarn");
			expect(info.lockfile).toBe("yarn.lock");
			expect(info.listCommand).toContain("yarn list");
		});

		it("returns correct info for bun", () => {
			const info = getPackageManagerInfo("bun");
			expect(info.name).toBe("bun");
			expect(info.lockfile).toBe("bun.lockb");
			expect(info.listCommand).toContain("bun pm ls");
		});
	});

	describe("getAllLockfiles", () => {
		it("returns all lockfile names", () => {
			const lockfiles = getAllLockfiles();
			expect(lockfiles).toContain("package-lock.json");
			expect(lockfiles).toContain("pnpm-lock.yaml");
			expect(lockfiles).toContain("yarn.lock");
			expect(lockfiles).toContain("bun.lockb");
			expect(lockfiles).toHaveLength(4);
		});
	});

	describe("PACKAGE_MANAGERS constant", () => {
		it("contains all four package managers", () => {
			const managers = Object.keys(PACKAGE_MANAGERS) as PackageManager[];
			expect(managers).toContain("npm");
			expect(managers).toContain("pnpm");
			expect(managers).toContain("yarn");
			expect(managers).toContain("bun");
			expect(managers).toHaveLength(4);
		});

		it("has unique lockfile names", () => {
			const lockfiles = Object.values(PACKAGE_MANAGERS).map(
				(pm) => pm.lockfile,
			);
			const uniqueLockfiles = new Set(lockfiles);
			expect(uniqueLockfiles.size).toBe(lockfiles.length);
		});
	});
});
