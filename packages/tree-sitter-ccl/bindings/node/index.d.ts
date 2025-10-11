/**
 * TypeScript definitions for tree-sitter-ccl Node.js bindings
 */

/**
 * Tree-sitter Language object for CCL
 */
export interface Language {
  /**
   * The ABI version number that this Language was generated for
   */
  readonly version: number;
}

/**
 * Get the tree-sitter Language object for CCL
 * @returns The CCL language object for use with tree-sitter
 */
export function language(): Language;

/**
 * Node type information from the grammar
 */
export const nodeTypeInfo: NodeTypeInfo[] | undefined;

/**
 * Information about a node type in the grammar
 */
export interface NodeTypeInfo {
  type: string;
  named: boolean;
  fields?: Record<string, FieldInfo>;
  children?: ChildInfo;
  subtypes?: SubtypeInfo[];
}

/**
 * Information about a field in a node type
 */
export interface FieldInfo {
  multiple: boolean;
  required: boolean;
  types: TypeInfo[];
}

/**
 * Information about children of a node type
 */
export interface ChildInfo {
  multiple: boolean;
  required: boolean;
  types: TypeInfo[];
}

/**
 * Information about a type
 */
export interface TypeInfo {
  type: string;
  named: boolean;
}

/**
 * Information about a subtype
 */
export interface SubtypeInfo {
  type: string;
  named: boolean;
}
