/**
 * Generate Markdown reference documentation from a Gleam
 * `package-interface.json` file.
 *
 * @packageDocumentation
 */

// oclif-required export
export { run } from "@oclif/core";
export {
	type GenerateReferenceOptions,
	type GenerateReferenceResult,
	generateReference,
	readPackageInterface,
} from "./api.js";
export { moduleSlug, type RenderedPage, renderPackage } from "./render.js";
export type {
	FnType,
	GleamAlias,
	GleamConstant,
	GleamConstructor,
	GleamDeprecation,
	GleamFunction,
	GleamModuleInterface,
	GleamPackageInterface,
	GleamParameter,
	GleamType,
	GleamTypeDefinition,
	NamedType,
	TupleType,
	UnknownType,
	VariableType,
} from "./types.js";
