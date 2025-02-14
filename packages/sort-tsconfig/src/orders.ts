/**
 * A list of keys in desired sort order.
 *
 * @beta
 */
export type OrderList = string[];

/**
 * @beta
 */
export const TopLevelFieldsOrder: OrderList = [
	"$schema",
	"files",
	"extends",
	"include",
	"exclude",
	"references",
	"compilerOptions",
];

/**
 * @beta
 */
export const TypeCheckingOrder: OrderList = [
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
];

/**
 * @beta
 */
export const EmitOrder: OrderList = [
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
];

/**
 * @beta
 */
export const ModulesOrder: OrderList = [
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
];

/**
 * @beta
 */
export const JsSupportOrder: OrderList = [
	"allowJs",
	"checkJs",
	"maxNodeModuleJsDepth",
];

/**
 * @beta
 */
export const EditorSupportOrder: OrderList = ["disableSizeLimit", "plugins"];

/**
 * @beta
 */
export const InteropConstraintsOrder: OrderList = [
	"allowSyntheticDefaultImports",
	"esModuleInterop",
	"forceConsistentCasingInFileNames",
	"isolatedModules",
	"preserveSymlinks",
];

/**
 * @beta
 */
export const BackCompatOrder: OrderList = [
	"charset",
	"keyofStringsOnly",
	"noImplicitUseStrict",
	"noStrictGenericChecks",
	"out",
	"suppressExcessPropertyErrors",
	"suppressImplicitAnyIndexErrors",
];

/**
 * @beta
 */
export const LangEnvOrder: OrderList = [
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
];

/**
 * @beta
 */
export const CompilerDiagnosticsOrder: OrderList = [
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
];

/**
 * @beta
 */
export const ProjectsOrder: OrderList = [
	"composite",
	"disableReferencedProjectLoad",
	"disableSolutionSearching",
	"disableSourceOfProjectReferenceRedirect",
	"incremental",
	"tsBuildInfoFile",
];

/**
 * @beta
 */
export const OutputFormattingOrder: OrderList = [
	"noErrorTruncation",
	"preserveWatchOutput",
	"pretty",
];

/**
 * @beta
 */
export const CompletenessOrder: OrderList = [
	"skipDefaultLibCheck",
	"skipLibCheck",
];

/**
 * @beta
 */
export const CommandLineOrder: OrderList = [];

/**
 * @beta
 */
export const WatchOrder: OrderList = [
	"assumeChangesOnlyAffectDirectDependencies",
];

/**
 * Sorting order for keys in the compilerOptions section of tsconfig. The groups and the order within each group are
 * based on the order at https://www.typescriptlang.org/tsconfig#compiler-options. However, the order of the groups has
 * been adjusted, and a few properties are moved earlier in the order since they're more important to our repo
 * tsconfigs.
 */
const defaultCompilerOptionsOrder: OrderList = [
	...TypeCheckingOrder,
	...ModulesOrder,
	...EmitOrder,
	...JsSupportOrder,
	...EditorSupportOrder,
	...InteropConstraintsOrder,
	...BackCompatOrder,
	...LangEnvOrder,
	...CompilerDiagnosticsOrder,
	...ProjectsOrder,
	...OutputFormattingOrder,
	...CompletenessOrder,
	...CommandLineOrder,
	...WatchOrder,
] as const;

const preferredCompilerOptionsOrder: OrderList = [
	"rootDir", // From the Modules group
	"outDir", // From the Emit group
	"composite", // From the Projects group
	"incremental", // From the Projects group
	"tsBuildInfoFile", // From the Projects group
	"module", // From the Modules group
	"moduleResolution", // From the Modules group
	"target", // From the LangEnv group
	"lib", // From the LangEnv group
	"jsx", // From the LangEnv group

	...[
		...EmitOrder.filter(
			(k) => !["rootDir", "module", "moduleResolution"].includes(k),
		),
	],
	...[...ModulesOrder.filter((k) => !["outDir"].includes(k))],
	...TypeCheckingOrder,
	...[
		...ProjectsOrder.filter(
			(k) => !["composite", "incremental", "tsBuildInfoFile"].includes(k),
		),
	],
	...JsSupportOrder,
	...EditorSupportOrder,
	...InteropConstraintsOrder,
	...[...LangEnvOrder.filter((k) => !["target", "lib", "jsx"].includes(k))],
	...CompilerDiagnosticsOrder,
	...OutputFormattingOrder,
	...CompletenessOrder,
	...WatchOrder,
	...BackCompatOrder,
] as const;

/**
 * Default sort order for tsconfig files. This order is based on the order that fields are documented at
 * {@link https://www.typescriptlang.org/tsconfig/}.
 *
 * @beta
 */
export const defaultSortOrder: OrderList = [
	...TopLevelFieldsOrder,
	...defaultCompilerOptionsOrder,
] as const;

/**
 * Preferred sort order for tsconfig files. This order is intended to put the most common properties first, and ensure
 * properties that are often set together are ordered together.
 *
 * @beta
 */
export const preferredSortOrder: OrderList = [
	"files",
	"include",
	"exclude",
	"extends",
	...[
		...TopLevelFieldsOrder.filter(
			(k) =>
				!["extends", "files", "include", "exclude", "references"].includes(k),
		),
	],
	...preferredCompilerOptionsOrder,
	"references",
] as const;
