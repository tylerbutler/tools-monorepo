import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { Indent } from "detect-indent";
import detectIndent from "detect-indent";
import path from "pathe";
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
export async function readJsonWithIndent<J = unknown>(
	filePath: string,
): Promise<{
	json: J;
	indent: Indent;
}> {
	console.log(
		existsSync(filePath),
		filePath,
		path.isAbsolute(filePath),
		path.relative(process.cwd(), filePath),
	);
	let contents: string;
	try {
		contents = await readFile(filePath, {
			encoding: "utf8",
		});
	} catch (error) {
		throw error;
	}
	const indent = detectIndent(contents);
	const json = JSON.parse(contents);
	return { json, indent };
}

/**
 * Writes a PackageJson object to a file.
 *
 * @beta
 */
function writePackageJson<J extends PackageJson = PackageJson>(
	packagePath: string,
	pkgJson: J,
	{ indent, sort }: JsonWriteOptions,
) {
	const spaces =
		typeof indent === "string"
			? indent
			: (indent?.indent ?? defaultJsonWriteOptions.indent);
	const jsonValue =
		(sort ?? defaultJsonWriteOptions.sort) ? sortPackageJson(pkgJson) : pkgJson;
	return writeJsonSync(packagePath, jsonValue, { spaces });
}

/**
 * A function that transforms a PackageJson and returns the transformed object.
 *
 * @beta
 */
export type PackageTransformer<J extends PackageJson = PackageJson> = (
	json: J,
) => J | Promise<J>;

/**
 * Reads the contents of package.json, applies a transform function to it, then writes
 * the results back to the source file.
 *
 * @param packagePath - A path to a package.json file or a folder containing one. If the
 * path is a directory, the package.json from that directory will be used.
 * @param packageTransformer - A function that will be executed on the package.json
 * contents before writing it back to the file.
 * @param options - Options that control the output JSON format.
 *
 * @beta
 */
export async function updatePackageJsonFile<
	J extends PackageJson = PackageJson,
>(
	packagePath: string,
	packageTransformer: PackageTransformer,
	options?: JsonWriteOptions,
): Promise<void> {
	const resolvedPath = packagePath.endsWith("package.json")
		? packagePath
		: path.join(packagePath, "package.json");
	const { json, indent } = await readJsonWithIndent<J>(resolvedPath);
	const pkgJson = json;

	// Transform the package.json
	const transformed = await Promise.resolve(packageTransformer(pkgJson));

	writePackageJson(resolvedPath, transformed, { sort: options?.sort, indent });
}
