import { isAbsolute, normalize, relative, resolve } from "pathe";

function normalizeRoot(root: string): string {
	return normalize(resolve(root));
}

function isPathWithinRoot(rootPath: string, candidatePath: string): boolean {
	const relativePath = normalize(relative(rootPath, candidatePath));
	if (relativePath === "" || relativePath === ".") {
		return true;
	}
	return (
		!isAbsolute(relativePath) &&
		relativePath !== ".." &&
		!relativePath.startsWith("../")
	);
}

/**
 * Resolves a candidate file path against the repository root and verifies it does not escape that root.
 */
export function resolveRepoFilePath(root: string, filePath: string): string {
	if (filePath.trim().length === 0) {
		throw new Error("File path cannot be empty.");
	}

	const rootPath = normalizeRoot(root);
	const candidatePath = normalize(resolve(rootPath, filePath));

	if (!isPathWithinRoot(rootPath, candidatePath)) {
		throw new Error(
			`File path must be within repository root. Received: ${filePath}`,
		);
	}

	return candidatePath;
}

/**
 * Converts an input path into a normalized repository-relative path after validating root containment.
 */
export function normalizeRepoRelativeFilePath(
	root: string,
	filePath: string,
): string {
	const rootPath = normalizeRoot(root);
	const absolutePath = resolveRepoFilePath(rootPath, filePath);
	const relativePath = normalize(relative(rootPath, absolutePath)).replace(
		/\\/g,
		"/",
	);

	if (relativePath === "" || relativePath === ".") {
		throw new Error("File path resolves to repository root instead of a file.");
	}

	return relativePath;
}
