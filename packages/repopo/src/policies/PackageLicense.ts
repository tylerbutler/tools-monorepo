import { copyFileSync, existsSync, readFileSync } from "node:fs";
import path from "pathe";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
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
function copyLicenseFile(
	rootLicensePath: string,
	packageLicensePath: string,
	policyName: string,
	file: string,
	packageName: string,
	licenseFileName: string,
	isCreate: boolean,
): PolicyFixResult {
	try {
		copyFileSync(rootLicensePath, packageLicensePath);
		return {
			name: policyName,
			file,
			resolved: true,
			errorMessage: isCreate
				? `Created ${licenseFileName} file for package "${packageName}"`
				: `Updated ${licenseFileName} file for package "${packageName}" to match root`,
		};
	} catch {
		return {
			name: policyName,
			file,
			resolved: false,
			errorMessage: isCreate
				? `Failed to copy ${licenseFileName} to package "${packageName}"`
				: `Failed to update ${licenseFileName} for package "${packageName}"`,
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
>("PackageLicense", async (json, { file, root, resolve, config }) => {
	const skipPrivate = config?.skipPrivate ?? true;
	const licenseFileName = config?.licenseFileName ?? DEFAULT_LICENSE_FILE_NAME;

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
		const result: PolicyFailure = {
			name: POLICY_NAME,
			file,
			autoFixable: false,
			errorMessage: `Cannot validate package LICENSE: root ${licenseFileName} file not found`,
		};
		return result;
	}

	// Check if package LICENSE exists
	if (!existsSync(packageLicensePath)) {
		if (resolve) {
			return copyLicenseFile(
				rootLicensePath,
				packageLicensePath,
				POLICY_NAME,
				file,
				packageName,
				licenseFileName,
				true,
			);
		}

		const result: PolicyFailure = {
			name: POLICY_NAME,
			file,
			autoFixable: true,
			errorMessage: `${licenseFileName} file missing for package "${packageName}"`,
		};
		return result;
	}

	// Compare package LICENSE with root LICENSE
	const packageLicenseContent = readFileSync(packageLicensePath, "utf-8");
	const rootLicenseContent = readFileSync(rootLicensePath, "utf-8");

	if (packageLicenseContent !== rootLicenseContent) {
		if (resolve) {
			return copyLicenseFile(
				rootLicensePath,
				packageLicensePath,
				POLICY_NAME,
				file,
				packageName,
				licenseFileName,
				false,
			);
		}

		const result: PolicyFailure = {
			name: POLICY_NAME,
			file,
			autoFixable: true,
			errorMessage: `${licenseFileName} file in package "${packageName}" doesn't match root ${licenseFileName}`,
		};
		return result;
	}

	return true;
});
