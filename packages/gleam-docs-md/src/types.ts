/**
 * Types describing the subset of Gleam's `package-interface.json` shape that
 * the renderer consumes. The JSON is produced by `gleam docs build` and lives
 * under `build/dev/docs/<package>/package-interface.json`.
 *
 * @packageDocumentation
 */

/**
 * A reference to a Gleam type as encoded in `package-interface.json`.
 *
 * @beta
 */
export type GleamType = NamedType | FnType | TupleType | VariableType;

/**
 * A named type reference (e.g. `String`, `Result(a)`).
 *
 * @beta
 */
export interface NamedType {
	kind: "named";
	name: string;
	module?: string;
	package?: string;
	parameters?: GleamType[];
}

/**
 * A function type reference.
 *
 * @beta
 */
export interface FnType {
	kind: "fn";
	parameters?: GleamType[];
	return: GleamType;
}

/**
 * A tuple type reference.
 *
 * @beta
 */
export interface TupleType {
	kind: "tuple";
	elements?: GleamType[];
}

/**
 * A type variable (e.g. `a`, `b`).
 *
 * @beta
 */
export interface VariableType {
	kind: "variable";
	id?: number;
}

/**
 * Fallback for type kinds the renderer doesn't recognise.
 *
 * @beta
 */
export interface UnknownType {
	kind?: string;
	name?: string;
}

/**
 * A labeled or positional parameter on a function or constructor.
 *
 * @beta
 */
export interface GleamParameter {
	label?: string | null;
	type: GleamType;
}

/**
 * A data constructor on a sum or product type.
 *
 * @beta
 */
export interface GleamConstructor {
	name: string;
	documentation?: string | string[];
	parameters?: GleamParameter[];
	/** Some Gleam versions emit `arguments` instead of `parameters`. */
	arguments?: GleamParameter[];
}

/**
 * A deprecation notice attached to a type, alias, constant, or function.
 *
 * @beta
 */
export interface GleamDeprecation {
	message?: string;
}

/**
 * A type definition (possibly with constructors).
 *
 * @beta
 */
export interface GleamTypeDefinition {
	documentation?: string | string[];
	deprecation?: GleamDeprecation;
	parameters?: number;
	constructors?:
		| GleamConstructor[]
		| Record<string, Omit<GleamConstructor, "name">>;
}

/**
 * A type alias definition.
 *
 * @beta
 */
export interface GleamAlias {
	documentation?: string | string[];
	deprecation?: GleamDeprecation;
	parameters?: number;
	alias?: GleamType;
	/** Some Gleam versions emit `type` instead of `alias`. */
	type?: GleamType;
}

/**
 * A module-level constant.
 *
 * @beta
 */
export interface GleamConstant {
	documentation?: string | string[];
	deprecation?: GleamDeprecation;
	type: GleamType;
}

/**
 * A module-level function.
 *
 * @beta
 */
export interface GleamFunction {
	documentation?: string | string[];
	deprecation?: GleamDeprecation;
	parameters?: GleamParameter[];
	return?: GleamType;
}

/**
 * One module's worth of public API metadata.
 *
 * @beta
 */
export interface GleamModuleInterface {
	documentation?: string | string[];
	types?: Record<string, GleamTypeDefinition>;
	"type-aliases"?: Record<string, GleamAlias>;
	constants?: Record<string, GleamConstant>;
	functions?: Record<string, GleamFunction>;
}

/**
 * The top-level shape of `package-interface.json`.
 *
 * @beta
 */
export interface GleamPackageInterface {
	name: string;
	version: string;
	modules: Record<string, GleamModuleInterface>;
}
