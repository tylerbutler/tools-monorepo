import type { PathLike } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Indent } from "detect-indent";
import detectIndent from "detect-indent";
import { sortPackageJson } from "sort-package-json";
import type { PackageJson } from "type-fest";

import jsonfile from "jsonfile";
const { writeFileSync: writeJsonSync } = jsonfile;

/**
 * Options to use when writing JSON files.
 *
 * @beta
 */
export interface JsonWriteOptions {
	/**
	 * The indent to use when writing JSON.
	 */
	indent?: string | Indent | undefined;

	/**
	 * If true, the JSON will be sorted using sort-package-json before writing.
	 */
	sort?: true | undefined;
}

const defaultJsonWriteOptions = {
	indent: "\t",
	sort: true,
};
/**
 * Reads a JSON file and its indentation.
 *
 * @param filePath - path to a JSON file.
 * @returns The parsed JSON and detected indent details.
 *
 * @beta
 */
export async function readJsonWithIndent(filePath: PathLike): Promise<{
	json: unknown;
	indent: Indent;
}> {
	const contents: string = await readFile(filePath, {
		encoding: "utf8",
	});
	const indent = detectIndent(contents);
	const json = JSON.parse(contents);
	return { json, indent };
}

/**
 * Writes a PackageJson object to a file.
 *
 * @beta
 */
function writePackageJson(
	packagePath: string,
	pkgJson: PackageJson,
	{ indent, sort }: JsonWriteOptions,
) {
	const spaces =
		typeof indent === "string"
			? indent
			: indent?.indent ?? defaultJsonWriteOptions.indent;
	const jsonValue =
		sort ?? defaultJsonWriteOptions.sort ? sortPackageJson(pkgJson) : pkgJson;
	return writeJsonSync(packagePath, jsonValue, { spaces });
}

/**
 * A function that transforms a PackaageJson and returns the transformed object.
 *
 * @beta
 */
export type PackageTransformer<T extends PackageJson = PackageJson> = (
	json: T,
) => T;

/**
 * Reads the contents of package.json, applies a transform function to it, then writes the results back to the source
 * file.
 *
 * @param packagePath - A path to a package.json file or a folder containing one. If the path is a directory, the
 * package.json from that directory will be used.
 * @param packageTransformer - A function that will be executed on the package.json contents before writing it
 * back to the file.
 *
 * @beta
 */
export async function updatePackageJsonFile<
	T extends PackageJson = PackageJson,
>(
	packagePath: string,
	packageTransformer: PackageTransformer,
	options?: JsonWriteOptions,
): Promise<void> {
	const resolvedPath = packagePath.endsWith("package.json")
		? packagePath
		: path.join(packagePath, "package.json");
	const { json, indent } = await readJsonWithIndent(resolvedPath);
	const pkgJson = json as T;

	// Transform the package.json
	const transformed = packageTransformer(pkgJson);

	writePackageJson(resolvedPath, transformed, { sort: options?.sort, indent });
}
