import { readFileSync, writeFileSync } from "node:fs";
import detectIndent from "detect-indent";
import { sortJsonc } from "sort-jsonc";
import JSONC from "tiny-jsonc";
import type { TsConfigJson } from "type-fest";

/**
 * Sorting order for keys in the compilerOptions section of tsconfig. The groups and the order within each group are
 * based on the order at https://www.typescriptlang.org/tsconfig#compiler-options. However, the order of the groups has
 * been adjusted, and a few properties are moved earlier in the order since they're more important to our repo
 * tsconfigs.
 */
const compilerOptionsOrder = [
	"rootDir", // From the Modules group
	"outDir", // From the Emit group
	"module", // From the Modules group
	"moduleResolution", // From the Modules group

	// Emit
	"declaration",
	"declarationDir",
	"declarationMap",
	"downlevelIteration",
	"emitBOM",
	"emitDeclarationOnly",
	"importHelpers",
	"importsNotUsedAsValues",
	"inlineSourceMap",
	"inlineSources",
	"mapRoot",
	"newLine",
	"noEmit",
	"noEmitHelpers",
	"noEmitOnError",
	"outFile",
	"preserveConstEnums",
	"preserveValueImports",
	"removeComments",
	"sourceMap",
	"sourceRoot",
	"stripInternal",

	// Modules
	"allowArbitraryExtensions",
	"allowImportingTsExtensions",
	"allowUmdGlobalAccess",
	"baseUrl",
	"noResolve",
	"paths",
	"resolveJsonModule",
	"rootDirs",
	"typeRoots",
	"types",

	// Type checking
	"allowUnreachableCode",
	"allowUnusedLabels",
	"alwaysStrict",
	"exactOptionalPropertyTypes",
	"noFallthroughCasesInSwitch",
	"noImplicitAny",
	"noImplicitOverride",
	"noImplicitReturns",
	"noImplicitThis",
	"noPropertyAccessFromIndexSignature",
	"noUncheckedIndexedAccess",
	"noUnusedLocals",
	"noUnusedParameters",
	"strict",
	"strictBindCallApply",
	"strictFunctionTypes",
	"strictNullChecks",
	"strictPropertyInitialization",
	"useUnknownInCatchVariables",

	// JavaScript Support
	"allowJs",
	"checkJs",
	"maxNodeModuleJsDepth",

	// Projects
	"composite",
	"disableReferencedProjectLoad",
	"disableSolutionSearching",
	"disableSourceOfProjectReferenceRedirect",
	"incremental",
	"tsBuildInfoFile",

	// Editor Support
	"disableSizeLimit",
	"plugins",

	// InteropConstraints
	"allowSyntheticDefaultImports",
	"esModuleInterop",
	"forceConsistentCasingInFileNames",
	"isolatedModules",
	"preserveSymlinks",

	// Language and Environment
	"emitDecoratorMetadata",
	"experimentalDecorators",
	"jsx",
	"jsxFactory",
	"jsxFragmentFactory",
	"jsxImportSource",
	"lib",
	"noLib",
	"reactNamespace",
	"target",
	"useDefineForClassFields",

	// Diagnostics
	"diagnostics",
	"explainFiles",
	"extendedDiagnostics",
	"generateCpuProfile",
	"listEmittedFiles",
	"listFiles",
	"traceResolution",

	// Output formatting
	"noErrorTruncation",
	"preserveWatchOutput",
	"pretty",

	// Completeness
	"skipDefaultLibCheck",
	"skipLibCheck",

	// Watch Options
	"assumeChangesOnlyAffectDirectDependencies",

	// Backwards Compatibility
	"charset",
	"keyofStringsOnly",
	"noImplicitUseStrict",
	"noStrictGenericChecks",
	"out",
	"suppressExcessPropertyErrors",
	"suppressImplicitAnyIndexErrors",
] as const;

/**
 * Sorting order for tsconfig files.
 */
const sortOrder = [
	"extends",
	"include",
	"exclude",
	"compilerOptions",
	...compilerOptionsOrder,
	"references",
];

const orderMap: Map<string, number> = new Map();

for (const [index, key] of sortOrder.entries()) {
	orderMap.set(key, index);
}

/**
 * @beta
 */
export interface SortTsconfigResult {
	alreadySorted: boolean;
	tsconfig: string;
}

/**
 * Sorts a tsconfig file, optionally writing the changes back to the file.
 *
 * @param tsconfigPath - path to a tsconfig file
 * @param write - if true, the file will be overwritten with sorted content
 * @returns An object containing a boolean indicating whether the file was already sorted and the sorted tsconfig
 * string.
 *
 * @beta
 */
export function sortTsconfigFile(
	tsconfigPath: string,
	write: boolean,
): SortTsconfigResult {
	const sorted = isSorted(tsconfigPath);

	const origString = readFileSync(tsconfigPath).toString();
	const { indent } = detectIndent(origString);
	const sortedString = sortJsonc(origString, {
		sort: sortOrder,
		spaces: indent,
	});

	// normalize the original and sorted string using prettier so we can compare them safely

	if (!sorted && write) {
		writeFileSync(tsconfigPath, sortedString);
	}

	return {
		alreadySorted: sorted,
		tsconfig: sortedString,
	};
}

/**
 * Checks if a tsconfig file is sorted.
 *
 * @beta
 */
export function isSorted(tsconfig: string): boolean {
	// const { default: jsonc } = await JSONC;
	const content = readFileSync(tsconfig, { encoding: "utf8" });
	const currentValue: TsConfigJson = JSONC.parse(content);
	const result = objectIsSorted(currentValue);
	return result;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function objectIsSorted(obj: { [s: string]: any }): boolean {
	const properties = [...Object.entries(obj)];
	let index = -1;
	for (const [key, value] of Object.entries(obj)) {
		index++;
		// const [key, value] = entry;

		// If the value is an object, recursively check the object's sort.
		if (isObject(value) && !objectIsSorted(value)) {
			return false;
		}

		const nextKey =
			index >= properties.length - 1 ? undefined : properties[index + 1][0];
		const sortIndex = getSortIndex(key);
		const nextSortIndex = getSortIndex(nextKey);
		if (sortIndex > nextSortIndex) {
			return false;
		}
	}
	return true;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function isObject(value: any): boolean {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-member-access
	return value && typeof value === "object" && value.constructor === Object;
}

function getSortIndex(key: string | undefined): number {
	// get the expected sort index of the key; if not found, (unexpected key) use a number greater than any sortIndex,
	// assuming those items will always be at the bottom
	return key === undefined
		? orderMap.size + 1
		: orderMap.get(key) ?? orderMap.size + 1;
}
