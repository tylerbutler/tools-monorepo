import fs from "node:fs";
import path from "node:path";
import type ts from "typescript";
import { sha256 } from "./hash.js";
import { require } from "./tasks/taskUtils.js";

// const defaultTscUtil = createTscUtil(ts);
// export const parseCommandLine = defaultTscUtil.parseCommandLine;
// export const findConfigFile = defaultTscUtil.findConfigFile;
// export const readConfigFile = defaultTscUtil.readConfigFile;

/**
 * Matches fluid-tsc command start.
 * Upon match index 1 and group.type will be "commonjs"|"module".
 * Remaining string will be tsc arguments.
 */
export const fluidTscRegEx = /^fluid-tsc\s+(?<type>commonjs|module)/;

// See convertToProgramBuildInfoCompilerOptions in typescript src/compiler/builder.ts
const incrementalOptions = [
	// affectsEmit === true
	"assumeChangesOnlyAffectDirectDependencies",
	"target",
	"listFilesOnly",
	"module",
	"jsx",
	"declaration",
	"declarationMap",
	"emitDeclarationOnly",
	"sourceMap",
	"outFile",
	"outDir",
	"rootDir",
	"composite",
	"tsBuildInfoFile",
	"removeComments",
	"importHelpers",
	"importsNotUsedAsValues",
	"downlevelIteration",
	"esModuleInterop",
	"sourceRoot",
	"mapRoot",
	"inlineSourceMap",
	"inlineSources",
	"emitDecoratorMetadata",
	"jsxImportSource",
	"out",
	"reactNamespace",
	"emitBOM",
	"newLine",
	"stripInternal",
	"noEmitHelpers",
	"noEmitOnError",
	"preserveConstEnums",
	"declarationDir",
	"useDefineForClassFields",
	"preserveValueImports",

	// affectsSemanticDiagnostics === true
	"noImplicitAny",
	"strictNullChecks",
	"strictPropertyInitialization",
	"noImplicitThis",
	"useUnknownInCatchVariables",
	"noUnusedLocals",
	"noUnusedParameters",
	"exactOptionalPropertyTypes",
	"noImplicitReturns",
	"noFallthroughCasesInSwitch",
	"noUncheckedIndexedAccess",
	"noImplicitOverride",
	"allowSyntheticDefaultImports",
	"allowUmdGlobalAccess",
	"experimentalDecorators",
	"noErrorTruncation",
	"noImplicitUseStrict",
	"allowUnusedLabels",
	"allowUnreachableCode",
	"suppressExcessPropertyErrors",
	"suppressImplicitAnyIndexErrors",
	"noStrictGenericChecks",
	"useDefineForClassFields",

	"skipLibCheck",
	"skipdefaultlibcheck",
	"strict",
	"strictBindCallApply",
	"strictFunctionTypes",
].sort(); // sort it so that the result of the filter is sorted as well.

function filterIncrementalOptions(options: Record<string, unknown>) {
	const newOptions: Record<string, unknown> = {};
	for (const key of incrementalOptions) {
		if (options[key] !== undefined) {
			newOptions[key] = options[key];
		}
	}
	return newOptions;
}

function convertOptionPaths(
	options: ts.CompilerOptions,
	base: string,
	// biome-ignore lint/nursery/noShadow: path parameter is standard TypeScript API naming convention
	convert: (base: string, path: string) => string,
): ts.CompilerOptions {
	// Shallow clone 'CompilerOptions' before modifying.
	const result = { ...options };

	// Convert 'string' properties that potentially contain paths.
	for (const key of [
		"baseUrl",
		"configFilePath",
		"declarationDir",
		"outDir",
		"rootDir",
		"project",
	]) {
		const value = result[key] as string;
		if (value !== undefined) {
			result[key] = convert(base, value);
		}
	}

	// Convert 'string[]' properties that potentially contain paths.
	for (const key of ["typeRoots"]) {
		const value = result[key] as string[];
		if (value !== undefined) {
			// Note that this also shallow clones the array.
			// biome-ignore lint/nursery/noShadow: value parameter in map shadows outer value variable, but is standard map pattern
			result[key] = value.map((value) => convert(base, value));
		}
	}

	return result;
}

// This is a duplicate of how tsc deal with case insensitive file system as keys (in tsBuildInfo)
function toLowerCase(x: string) {
	return x.toLowerCase();
}
// eslint-disable-next-line no-useless-escape
const fileNameLowerCaseRegExp = /[^\u0130\u0131\u00DFa-z0-9\\/:\-_. ]+/g;

function createGetCanonicalFileName(tsLib: typeof ts) {
	return tsLib.sys.useCaseSensitiveFileNames
		? (x: string) => x
		: (x: string) =>
				fileNameLowerCaseRegExp.test(x)
					? x.replace(fileNameLowerCaseRegExp, toLowerCase)
					: x;
}

function createGetSourceFileVersion(tsLib: typeof ts) {
	// The TypeScript compiler performs some light preprocessing of the source file
	// text before calculating the file hashes that appear in *.tsbuildinfo.
	//
	// Our options are to either reach into the compiler internals, or duplicate
	// this preprocessing in 'Sail'.  Both options are fragile, but since
	// we're already calling into the TypeScript compiler, calling internals is
	// convenient.
	// biome-ignore lint/suspicious/noExplicitAny: Accessing TypeScript compiler internals
	const maybeGetHash = (tsLib as any).getSourceFileVersionAsHashFromText;

	if (!maybeGetHash) {
		// This internal function is added 5.0+
		if (Number.parseInt(tsLib.versionMajorMinor.split(".")[0], 10) >= 5) {
			// TODO: Log warning about missing internal TypeScript function
		}

		// Return 'sha256' for compatibility with older versions of TypeScript while we're
		// transitioning.
		return sha256;
	}

	return (buffer: Buffer): string => {
		return maybeGetHash(
			{
				createHash: sha256,
			},
			buffer.toString(),
		);
	};
}

function createTscUtil(tsLib: typeof ts) {
	return {
		tsLib,
		parseCommandLine: (command: string) => {
			// TODO: parse the command line for real, split space for now.
			// In case of fluid-tsc, replace those parts with 'tsc' before split.
			const args = command.replace(fluidTscRegEx, "tsc").split(" ");
			if (command.includes("&&")) {
				// TODO: Handle chained commands properly
			}

			let slicedArgs = args.slice(1);
			// workaround for https://github.com/microsoft/TypeScript/issues/59095
			// TODO: This breaks --force (by removing it). Find a way to fix --force.
			// See code in leaf/tscTask.ts which adds --force.
			if (slicedArgs.at(-1) === "--force") {
				slicedArgs = slicedArgs.slice(0, slicedArgs.length - 1);
			}
			const parsedCommand = tsLib.parseCommandLine(slicedArgs);

			if (parsedCommand.errors.length > 0) {
				for (const _error of parsedCommand.errors) {
					// TODO: Log or handle TypeScript command line parsing errors
				}
				return undefined;
			}

			return parsedCommand;
		},

		findConfigFile: (
			directory: string,
			parsedCommand: ts.ParsedCommandLine | undefined,
		) => {
			let tsConfigFullPath: string | undefined;
			const project = parsedCommand?.options.project;
			if (project !== undefined) {
				tsConfigFullPath = path.resolve(directory, project);
				if (
					fs.existsSync(tsConfigFullPath) &&
					fs.statSync(tsConfigFullPath).isDirectory()
				) {
					tsConfigFullPath = path.join(tsConfigFullPath, "tsconfig.json");
				}
			} else {
				// Does a search from given directory and up to find tsconfig.json.
				const foundConfigFile = tsLib.findConfigFile(
					directory,
					tsLib.sys.fileExists,
					"tsconfig.json",
				);
				if (foundConfigFile) {
					tsConfigFullPath = foundConfigFile;
				} else {
					// Assume there will be a local tsconfig.json and it is just currently missing.
					tsConfigFullPath = path.join(directory, "tsconfig.json");
				}
			}
			return tsConfigFullPath;
		},

		// biome-ignore lint/nursery/noShadow: path parameter is standard TypeScript API naming convention
		readConfigFile: (path: string) => {
			const configFile = tsLib.readConfigFile(path, tsLib.sys.readFile);
			if (configFile.error) {
				return undefined;
			}
			return configFile.config;
		},
		filterIncrementalOptions,
		convertOptionPaths,
		getCanonicalFileName: createGetCanonicalFileName(tsLib),
		getSourceFileVersion: createGetSourceFileVersion(tsLib),
	};
}

export type TscUtil = ReturnType<typeof createTscUtil>;

const tscUtilPathCache = new Map<string, TscUtil>();
const tscUtilLibPathCache = new Map<string, TscUtil>();

// biome-ignore lint/nursery/noShadow: path parameter is standard naming for file path utilities
export function getTscUtils(path: string): TscUtil {
	const tscUtilFromPath = tscUtilPathCache.get(path);
	if (tscUtilFromPath) {
		return tscUtilFromPath;
	}

	try {
		const tsPath = require.resolve("typescript", { paths: [path] });
		const tscUtilFromLibPath = tscUtilLibPathCache.get(tsPath);
		if (tscUtilFromLibPath) {
			tscUtilPathCache.set(path, tscUtilFromLibPath);
			return tscUtilFromLibPath;
		}

		const tsLib: typeof ts = require(tsPath);
		const tscUtil = createTscUtil(tsLib);
		tscUtilPathCache.set(path, tscUtil);
		tscUtilLibPathCache.set(tsPath, tscUtil);
		return tscUtil;
	} catch (e: unknown) {
		const error = e as Error;
		error.message = `Failed to load typescript module for '${path}'. 'typescript' dependency may be missing.: ${error.message}`;
		throw error;
	}
}

// Any paths given by typescript will be normalized to forward slashes.
// Local paths should be normalized to make any comparisons.
// biome-ignore lint/nursery/noShadow: path parameter is standard naming for file path utilities
export function normalizeSlashes(path: string): string {
	return path.replace(/\\/g, "/");
}
