import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "pathe";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * Policy settings for the PackageReadme repo policy.
 *
 * @alpha
 */
export interface PackageReadmeSettings {
	/**
	 * Whether to skip validation for private packages.
	 *
	 * @defaultValue true
	 *
	 * @remarks
	 *
	 * Private packages are typically not published and may not need a README file.
	 * Set to `false` to require README files for all packages.
	 */
	skipPrivate?: boolean;

	/**
	 * Whether to require the README title to match the package name.
	 *
	 * @defaultValue true
	 *
	 * @remarks
	 *
	 * When enabled, the first line of the README must be `# package-name`.
	 * This ensures consistency and helps users identify the package.
	 */
	requireMatchingTitle?: boolean;

	/**
	 * A string that must appear in the README content.
	 *
	 * @remarks
	 *
	 * Useful for ensuring all READMEs include required content like trademark
	 * notices, disclaimers, or standard documentation sections.
	 *
	 * @example
	 * ```typescript
	 * requiredContent: "## Trademark"
	 * ```
	 */
	requiredContent?: string;
}

/**
 * Extract the title from a README file (first markdown H1 heading).
 *
 * @param content - The README content
 * @returns The title text (without the `# ` prefix) or `undefined` if not found
 */
function extractReadmeTitle(content: string): string | undefined {
	const lines = content.split(/\r?\n/);
	for (const line of lines) {
		const match = line.match(/^#\s+(.+)$/);
		if (match) {
			return match[1].trim();
		}
	}
	return undefined;
}

/**
 * A repo policy that ensures each package has a README.md file with proper content.
 *
 * @remarks
 *
 * This policy validates that packages have documentation and can enforce:
 * 1. README.md file exists
 * 2. README title matches the package name
 * 3. README contains required content (e.g., trademark notices)
 *
 * The policy supports auto-fixing by creating a basic README with the package name as title.
 *
 * @example
 * ```typescript
 * import { makePolicy } from "repopo";
 * import { PackageReadme } from "repopo/policies";
 *
 * const config: RepopoConfig = {
 *   policies: [
 *     // Basic README validation
 *     makePolicy(PackageReadme),
 *
 *     // Require trademark notice in all READMEs
 *     makePolicy(PackageReadme, {
 *       requiredContent: "## Trademark",
 *     }),
 *   ],
 * };
 * ```
 *
 * @alpha
 */
export const PackageReadme = definePackagePolicy<
	PackageJson,
	PackageReadmeSettings | undefined
>("PackageReadme", async (json, { file, root, resolve, config }) => {
	const skipPrivate = config?.skipPrivate ?? true;
	const requireMatchingTitle = config?.requireMatchingTitle ?? true;
	const requiredContent = config?.requiredContent;

	// Skip private packages if configured to do so
	if (skipPrivate && json.private === true) {
		return true;
	}

	const packageName = json.name ?? "unknown";
	const packageDir = path.dirname(file);
	const readmePath = path.join(packageDir, "README.md");

	// Check if README exists
	if (!existsSync(readmePath)) {
		if (resolve) {
			try {
				// Create a basic README with the package name as title
				let content = `# ${packageName}\n`;
				if (requiredContent) {
					content += `\n${requiredContent}\n`;
				}
				writeFileSync(readmePath, content);
				const result: PolicyFixResult = {
					name: PackageReadme.name,
					file,
					resolved: true,
					errorMessage: `Created README.md for package "${packageName}"`,
				};
				return result;
			} catch {
				const result: PolicyFixResult = {
					name: PackageReadme.name,
					file,
					resolved: false,
					errorMessage: `Failed to create README.md for package "${packageName}"`,
				};
				return result;
			}
		}

		const result: PolicyFailure = {
			name: PackageReadme.name,
			file,
			autoFixable: true,
			errorMessage: `README.md missing for package "${packageName}"`,
		};
		return result;
	}

	// README exists, validate content
	const readmeContent = readFileSync(readmePath, "utf-8");
	const errors: string[] = [];
	let needsFix = false;

	// Check title matches package name
	if (requireMatchingTitle) {
		const title = extractReadmeTitle(readmeContent);
		if (title !== packageName) {
			errors.push(
				`README title "${title ?? "(none)"}" doesn't match package name "${packageName}"`,
			);
			// Title mismatch is not auto-fixable without potentially losing content
			needsFix = false;
		}
	}

	// Check required content
	if (requiredContent && !readmeContent.includes(requiredContent)) {
		errors.push(`README missing required content: "${requiredContent}"`);

		if (resolve) {
			try {
				// Append required content
				const newContent = readmeContent.endsWith("\n")
					? `${readmeContent}${requiredContent}\n`
					: `${readmeContent}\n${requiredContent}\n`;
				writeFileSync(readmePath, newContent);
				needsFix = true;
			} catch {
				// Fall through to report error
			}
		}
	}

	if (errors.length > 0) {
		if (needsFix) {
			const result: PolicyFixResult = {
				name: PackageReadme.name,
				file,
				resolved: true,
				errorMessage: errors.join("; "),
			};
			return result;
		}

		const result: PolicyFailure = {
			name: PackageReadme.name,
			file,
			autoFixable:
				requiredContent !== undefined &&
				!readmeContent.includes(requiredContent),
			errorMessage: errors.join("; "),
		};
		return result;
	}

	return true;
});
