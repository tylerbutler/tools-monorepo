import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "pathe";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

// Pre-compiled regex for performance
const LINE_SPLIT_REGEX = /\r?\n/;
const HEADING_REGEX = /^#\s+(.+)$/;

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
	const lines = content.split(LINE_SPLIT_REGEX);
	for (const line of lines) {
		const match = HEADING_REGEX.exec(line);
		if (match?.[1]) {
			return match[1].trim();
		}
	}
	return undefined;
}

/**
 * Create a basic README content with package name as title.
 */
function createReadmeContent(
	packageName: string,
	requiredContent?: string,
): string {
	let content = `# ${packageName}\n`;
	if (requiredContent) {
		content += `\n${requiredContent}\n`;
	}
	return content;
}

/**
 * Handle case when README is missing.
 */
async function handleMissingReadme(
	readmePath: string,
	packageName: string,
	file: string,
	resolve: boolean,
	requiredContent?: string,
): Promise<PolicyFailure | PolicyFixResult> {
	if (resolve) {
		try {
			await writeFile(
				readmePath,
				createReadmeContent(packageName, requiredContent),
			);
			return {
				name: "PackageReadme",
				file,
				resolved: true,
				autoFixable: true,
				errorMessages: [`Created README.md for package "${packageName}"`],
			};
		} catch {
			return {
				name: "PackageReadme",
				file,
				resolved: false,
				autoFixable: true,
				errorMessages: [
					`Failed to create README.md for package "${packageName}"`,
				],
			};
		}
	}

	return {
		name: "PackageReadme",
		file,
		autoFixable: true,
		errorMessages: [`README.md missing for package "${packageName}"`],
	};
}

/**
 * Validate README title against package name.
 *
 * @returns `true` if valid, or an error message string if invalid
 */
function validateTitle(
	readmeContent: string,
	packageName: string,
): true | string {
	const title = extractReadmeTitle(readmeContent);
	if (title !== packageName) {
		return `README title "${title ?? "(none)"}" doesn't match package name "${packageName}"`;
	}
	return true;
}

/**
 * Handle required content validation and auto-fix.
 */
async function handleRequiredContent(
	readmePath: string,
	readmeContent: string,
	requiredContent: string,
	resolve: boolean,
): Promise<{ error?: string; fixed: boolean }> {
	if (readmeContent.includes(requiredContent)) {
		return { fixed: false };
	}

	if (resolve) {
		try {
			const newContent = readmeContent.endsWith("\n")
				? `${readmeContent}${requiredContent}\n`
				: `${readmeContent}\n${requiredContent}\n`;
			await writeFile(readmePath, newContent);
			return {
				error: `README missing required content: "${requiredContent}"`,
				fixed: true,
			};
		} catch {
			// Fall through to report error
		}
	}

	return {
		error: `README missing required content: "${requiredContent}"`,
		fixed: false,
	};
}

interface ValidationContext {
	readmePath: string;
	readmeContent: string;
	packageName: string;
	file: string;
	resolve: boolean;
	requireMatchingTitle: boolean;
	requiredContent: string | undefined;
}

/**
 * Validate existing README content.
 */
async function validateExistingReadme(
	ctx: ValidationContext,
): Promise<true | PolicyFailure | PolicyFixResult> {
	const errors: string[] = [];
	let wasFixed = false;

	// Check title matches package name
	if (ctx.requireMatchingTitle) {
		const titleResult = validateTitle(ctx.readmeContent, ctx.packageName);
		if (titleResult !== true) {
			errors.push(titleResult);
		}
	}

	// Check required content
	if (ctx.requiredContent) {
		const contentResult = await handleRequiredContent(
			ctx.readmePath,
			ctx.readmeContent,
			ctx.requiredContent,
			ctx.resolve,
		);
		if (contentResult.error) {
			errors.push(contentResult.error);
		}
		if (contentResult.fixed) {
			wasFixed = true;
		}
	}

	if (errors.length === 0) {
		return true;
	}

	if (wasFixed) {
		return {
			name: "PackageReadme",
			file: ctx.file,
			resolved: true,
			autoFixable: true,
			errorMessages: [errors.join("; ")],
		};
	}

	return {
		name: "PackageReadme",
		file: ctx.file,
		autoFixable:
			ctx.requiredContent !== undefined &&
			!ctx.readmeContent.includes(ctx.requiredContent),
		errorMessages: [errors.join("; ")],
	};
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
>({
	name: "PackageReadme",
	description:
		"Ensures each package has a README.md file with proper title and required content.",
	handler: async (json, { file, resolve, config }) => {
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
			return await handleMissingReadme(
				readmePath,
				packageName,
				file,
				resolve,
				requiredContent,
			);
		}

		// README exists, validate content
		const readmeContent = await readFile(readmePath, "utf-8");
		return await validateExistingReadme({
			readmePath,
			readmeContent,
			packageName,
			file,
			resolve,
			requireMatchingTitle,
			requiredContent,
		});
	},
});
