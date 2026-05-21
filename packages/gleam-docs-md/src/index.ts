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
} from "./api.js";
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
