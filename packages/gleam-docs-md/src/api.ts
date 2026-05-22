/**
 * File-system orchestration: read a `package-interface.json`, render every
 * page via {@link renderPackage}, and write the Markdown files into a
 * directory. The rendering itself lives in {@link "./render"} and performs no
 * I/O.
 *
 * @packageDocumentation
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "pathe";
import { renderPackage } from "./render.js";
import type { GleamPackageInterface } from "./types.js";

/**
 * Options for {@link generateReference}.
 *
 * @beta
 */
export interface GenerateReferenceOptions {
	/**
	 * Path to a Gleam `package-interface.json` file. Typically lives under
	 * `build/dev/docs/<package>/package-interface.json` after running
	 * `gleam docs build`.
	 */
	docsJsonPath: string;

	/**
	 * Directory in which the generated Markdown files are written. The
	 * directory is removed and recreated on every run.
	 */
	outputDir: string;

	/**
	 * If provided, override the package name expected in the JSON. Defaults
	 * to "use whatever name is in the file".
	 */
	expectedPackageName?: string;

	/**
	 * URL prefix (with leading and trailing slashes) used for links to
	 * module pages from the index page.
	 *
	 * @defaultValue `"/reference/"`
	 */
	linkPrefix?: string;
}

/**
 * The result of a {@link generateReference} call.
 *
 * @beta
 */
export interface GenerateReferenceResult {
	/** Number of Markdown pages written, including the index page. */
	pageCount: number;
	/** Number of module pages written (excludes the index page). */
	moduleCount: number;
}

/**
 * Generate one Markdown page per Gleam module, plus an `index.md`, into
 * `outputDir`.
 *
 * @beta
 */
export async function generateReference(
	options: GenerateReferenceOptions,
): Promise<GenerateReferenceResult> {
	const { docsJsonPath, outputDir, expectedPackageName, linkPrefix } = options;

	const packageInterface = await readPackageInterface(
		docsJsonPath,
		expectedPackageName,
	);
	const pages = renderPackage(packageInterface, {
		...(linkPrefix === undefined ? {} : { linkPrefix }),
	});

	await rm(outputDir, { force: true, recursive: true });
	await mkdir(outputDir, { recursive: true });

	for (const page of pages) {
		await writeFile(path.join(outputDir, `${page.slug}.md`), page.markdown);
	}

	const moduleCount = pages.length - 1;
	return { pageCount: pages.length, moduleCount };
}

/**
 * Read and validate a `package-interface.json` file from disk.
 *
 * @beta
 */
export async function readPackageInterface(
	docsJsonPath: string,
	expectedPackageName?: string,
): Promise<GleamPackageInterface> {
	let raw: string;
	try {
		raw = await readFile(docsJsonPath, "utf8");
	} catch (error) {
		if (
			error !== null &&
			typeof error === "object" &&
			"code" in error &&
			(error as NodeJS.ErrnoException).code === "ENOENT"
		) {
			throw new Error(
				`Missing ${docsJsonPath}. Run \`gleam docs build\` from the repository root first.`,
			);
		}
		throw error;
	}

	const parsed = JSON.parse(raw) as Partial<GleamPackageInterface> | null;
	if (
		!parsed ||
		typeof parsed.name !== "string" ||
		typeof parsed.modules !== "object" ||
		(expectedPackageName !== undefined && parsed.name !== expectedPackageName)
	) {
		throw new Error(`Invalid Gleam package interface JSON at ${docsJsonPath}`);
	}

	return parsed as GleamPackageInterface;
}
