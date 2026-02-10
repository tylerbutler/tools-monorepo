import { existsSync } from "node:fs";
import { copyFile, readFile } from "node:fs/promises";
import path from "pathe";
import type { PackageJson } from "type-fest";
import type { PolicyFixResult } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * Policy settings for the PackageLicense repo policy.
 *
 * @alpha
 */
export interface PackageLicenseSettings {
	/**
	 * Whether to skip validation for private packages.
	 *
	 * @defaultValue true
	 *
	 * @remarks
	 *
	 * Private packages (those with `private: true` in package.json) are typically
	 * not published and may not need a LICENSE file. Set to `false` to require
	 * LICENSE files for all packages.
	 */
	skipPrivate?: boolean;

	/**
	 * The name of the LICENSE file to look for and sync.
	 *
	 * @defaultValue "LICENSE"
	 */
	licenseFileName?: string;
}

const DEFAULT_LICENSE_FILE_NAME = "LICENSE";
const POLICY_NAME = "PackageLicense";

/**
 * Copies the root LICENSE file to the package directory.
 * @returns A PolicyFixResult indicating success or failure.
 */
async function copyLicenseFile(
	rootLicensePath: string,
	packageLicensePath: string,
	policyName: string,
	file: string,
	packageName: string,
	licenseFileName: string,
	isCreate: boolean,
): Promise<PolicyFixResult> {
	try {
		await copyFile(rootLicensePath, packageLicensePath);
		return {
			name: policyName,
			file,
			resolved: true,
			autoFixable: true,
			errorMessages: [
				isCreate
					? `Created ${licenseFileName} file for package "${packageName}"`
					: `Updated ${licenseFileName} file for package "${packageName}" to match root`,
			],
		};
	} catch {
		return {
			name: policyName,
			file,
			resolved: false,
			autoFixable: true,
			errorMessages: [
				isCreate
					? `Failed to copy ${licenseFileName} to package "${packageName}"`
					: `Failed to update ${licenseFileName} for package "${packageName}"`,
			],
		};
	}
}

/**
 * A repo policy that ensures each package has a LICENSE file that matches the root LICENSE.
 *
 * @remarks
 *
 * This policy is essential for monorepos where individual packages are published
 * to npm. Each published package should include a LICENSE file, and it should
 * match the root repository's LICENSE to ensure consistent licensing.
 *
 * The policy:
 * 1. Checks if a LICENSE file exists in the package directory
 * 2. Compares it with the root LICENSE file
 * 3. Can auto-fix by copying the root LICENSE to the package directory
 *
 * By default, private packages are skipped since they're not published.
 *
 * @example
 * ```typescript
 * import { makePolicy } from "repopo";
 * import { PackageLicense } from "repopo/policies";
 *
 * const config: RepopoConfig = {
 *   policies: [
 *     // Use defaults (skip private, look for LICENSE)
 *     makePolicy(PackageLicense),
 *
 *     // Or require LICENSE for all packages including private
 *     makePolicy(PackageLicense, { skipPrivate: false }),
 *   ],
 * };
 * ```
 *
 * @alpha
 */
export const PackageLicense = definePackagePolicy<
	PackageJson,
	PackageLicenseSettings | undefined
>({
	name: "PackageLicense",
	description:
		"Ensures each package has a LICENSE file that matches the root repository LICENSE.",
	handler: async (json, { file, root, resolve, config }) => {
		const skipPrivate = config?.skipPrivate ?? true;
		const licenseFileName =
			config?.licenseFileName ?? DEFAULT_LICENSE_FILE_NAME;

		// Skip private packages if configured to do so
		if (skipPrivate && json.private === true) {
			return true;
		}

		const packageName = json.name ?? "unknown";
		// file is an absolute path, get the directory containing package.json
		const packageDir = path.dirname(file);
		const packageLicensePath = path.join(packageDir, licenseFileName);
		const rootLicensePath = path.join(root, licenseFileName);

		// Check if root LICENSE exists
		if (!existsSync(rootLicensePath)) {
			return {
				name: POLICY_NAME,
				file,
				autoFixable: false,
				errorMessages: [
					`Cannot validate package LICENSE: root ${licenseFileName} file not found`,
				],
			};
		}

		// Check if package LICENSE exists
		if (!existsSync(packageLicensePath)) {
			if (resolve) {
				return await copyLicenseFile(
					rootLicensePath,
					packageLicensePath,
					POLICY_NAME,
					file,
					packageName,
					licenseFileName,
					true,
				);
			}

			return {
				name: POLICY_NAME,
				file,
				autoFixable: true,
				errorMessages: [
					`${licenseFileName} file missing for package "${packageName}"`,
				],
			};
		}

		// Compare package LICENSE with root LICENSE
		const [packageLicenseContent, rootLicenseContent] = await Promise.all([
			readFile(packageLicensePath, "utf-8"),
			readFile(rootLicensePath, "utf-8"),
		]);

		if (packageLicenseContent !== rootLicenseContent) {
			if (resolve) {
				return await copyLicenseFile(
					rootLicensePath,
					packageLicensePath,
					POLICY_NAME,
					file,
					packageName,
					licenseFileName,
					false,
				);
			}

			return {
				name: POLICY_NAME,
				file,
				autoFixable: true,
				errorMessages: [
					`${licenseFileName} file in package "${packageName}" doesn't match root ${licenseFileName}`,
				],
			};
		}

		return true;
	},
});
