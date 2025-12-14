/**
 * Implementation capabilities configuration for CCL test filtering.
 *
 * This module provides a type-safe capability declaration system following
 * the patterns from ccl-test-lib for filtering tests based on what an
 * implementation supports.
 */

/**
 * CCL function identifiers.
 */
export type CCLFunction =
	| "parse"
	| "parse_indented"
	| "filter"
	| "compose"
	| "expand_dotted"
	| "build_hierarchy"
	| "get_string"
	| "get_int"
	| "get_bool"
	| "get_float"
	| "get_list"
	| "print"
	| "canonical_format"
	| "load"
	| "round_trip"
	| "compose_associative"
	| "identity_left"
	| "identity_right";

/**
 * All valid CCL functions.
 */
export const ALL_FUNCTIONS: CCLFunction[] = [
	"parse",
	"parse_indented",
	"filter",
	"compose",
	"expand_dotted",
	"build_hierarchy",
	"get_string",
	"get_int",
	"get_bool",
	"get_float",
	"get_list",
	"print",
	"canonical_format",
	"load",
	"round_trip",
];

/**
 * CCL feature identifiers.
 */
export type CCLFeature =
	| "comments"
	| "empty_keys"
	| "multiline"
	| "unicode"
	| "whitespace"
	| `experimental_${string}`
	| `optional_${string}`;

/**
 * All standard CCL features.
 */
export const STANDARD_FEATURES: CCLFeature[] = [
	"comments",
	"empty_keys",
	"multiline",
	"unicode",
	"whitespace",
];

/**
 * CCL behavior choices. Behaviors come in mutually exclusive pairs.
 */
export type CCLBehavior =
	| "boolean_strict"
	| "boolean_lenient"
	| "crlf_preserve_literal"
	| "crlf_normalize_to_lf"
	| "tabs_preserve"
	| "tabs_to_spaces"
	| "strict_spacing"
	| "loose_spacing"
	| "list_coercion_enabled"
	| "list_coercion_disabled"
	| "array_order_insertion"
	| "array_order_lexicographic";

/**
 * Strongly-typed behavior constants for IDE autocomplete and type safety.
 * Use these instead of raw strings when configuring behaviors.
 *
 * @example
 * ```typescript
 * import { Behavior } from '@tylerbu/ccl-test-runner-ts';
 *
 * const config = {
 *   behaviors: [
 *     Behavior.BooleanLenient,
 *     Behavior.CRLFNormalize,
 *     Behavior.TabsToSpaces,
 *   ],
 * };
 * ```
 */
export const Behavior = {
	// Boolean handling
	BooleanStrict: "boolean_strict",
	BooleanLenient: "boolean_lenient",

	// CRLF handling
	CRLFPreserve: "crlf_preserve_literal",
	CRLFNormalize: "crlf_normalize_to_lf",

	// Tab handling
	TabsPreserve: "tabs_preserve",
	TabsToSpaces: "tabs_to_spaces",

	// Spacing
	StrictSpacing: "strict_spacing",
	LooseSpacing: "loose_spacing",

	// List coercion
	ListCoercionEnabled: "list_coercion_enabled",
	ListCoercionDisabled: "list_coercion_disabled",

	// Array ordering
	ArrayOrderInsertion: "array_order_insertion",
	ArrayOrderLexicographic: "array_order_lexicographic",
} as const satisfies Record<string, CCLBehavior>;

/**
 * Mutually exclusive behavior groups.
 * Only one behavior from each group can be selected.
 */
export const BEHAVIOR_CONFLICTS: Record<string, CCLBehavior[]> = {
	boolean: ["boolean_strict", "boolean_lenient"],
	crlf_handling: ["crlf_preserve_literal", "crlf_normalize_to_lf"],
	tab_handling: ["tabs_preserve", "tabs_to_spaces"],
	spacing: ["strict_spacing", "loose_spacing"],
	list_coercion: ["list_coercion_enabled", "list_coercion_disabled"],
	array_order: ["array_order_insertion", "array_order_lexicographic"],
};

/**
 * CCL specification variants.
 */
export type CCLVariant = "proposed_behavior" | "reference_compliant";

/**
 * Strongly-typed variant constants for IDE autocomplete and type safety.
 *
 * @example
 * ```typescript
 * import { Variant } from '@tylerbu/ccl-test-runner-ts';
 *
 * const config = {
 *   variant: Variant.ProposedBehavior,
 * };
 * ```
 */
export const Variant = {
	ProposedBehavior: "proposed_behavior",
	ReferenceCompliant: "reference_compliant",
} as const satisfies Record<string, CCLVariant>;

/**
 * All valid CCL variants.
 */
export const ALL_VARIANTS: CCLVariant[] = [
	"proposed_behavior",
	"reference_compliant",
];

/**
 * Default behaviors for a typical CCL implementation.
 * Spread and override as needed.
 *
 * @example
 * ```typescript
 * import { DefaultBehaviors, Behavior } from '@tylerbu/ccl-test-runner-ts';
 *
 * // Use defaults
 * const behaviors = [...DefaultBehaviors];
 *
 * // Override one behavior
 * const customBehaviors = [
 *   ...DefaultBehaviors.filter(b => b !== Behavior.LooseSpacing),
 *   Behavior.StrictSpacing,
 * ];
 * ```
 */
export const DefaultBehaviors: readonly CCLBehavior[] = [
	Behavior.BooleanLenient,
	Behavior.CRLFNormalize,
	Behavior.TabsToSpaces,
	Behavior.LooseSpacing,
	Behavior.ListCoercionDisabled,
] as const;

/**
 * Implementation capabilities configuration.
 *
 * Declares what an implementation supports for test filtering.
 */
export interface ImplementationCapabilities {
	/** Name of the implementation */
	name: string;
	/** Version of the implementation */
	version: string;
	/** Supported CCL functions */
	functions: CCLFunction[];
	/** Supported optional features */
	features: CCLFeature[];
	/** Behavioral choices (one from each conflict group) */
	behaviors: CCLBehavior[];
	/** Specification variant choice */
	variant: CCLVariant;
	/** Tests to skip by name */
	skipTests?: string[];
}

/**
 * Validation error for capability configuration.
 */
export class CapabilityValidationError extends Error {
	public constructor(public readonly errors: string[]) {
		super(`Capability validation failed:\n  - ${errors.join("\n  - ")}`);
		this.name = "CapabilityValidationError";
	}
}

/**
 * Validate implementation capabilities for conflicts.
 */
export function validateCapabilities(
	capabilities: ImplementationCapabilities,
): void {
	const errors: string[] = [];

	// Check for conflicting behaviors
	for (const [group, conflictingBehaviors] of Object.entries(
		BEHAVIOR_CONFLICTS,
	)) {
		const selected = capabilities.behaviors.filter((b) =>
			conflictingBehaviors.includes(b),
		);
		if (selected.length > 1) {
			errors.push(
				`Conflicting behaviors in ${group}: ${selected.join(", ")} (pick only one)`,
			);
		}
	}

	if (errors.length > 0) {
		throw new CapabilityValidationError(errors);
	}
}

/**
 * Get the conflicting behavior for a given behavior.
 * Returns undefined if no conflict exists.
 */
export function getConflictingBehavior(
	behavior: CCLBehavior,
): CCLBehavior | undefined {
	for (const conflictingBehaviors of Object.values(BEHAVIOR_CONFLICTS)) {
		if (conflictingBehaviors.includes(behavior)) {
			return conflictingBehaviors.find((b) => b !== behavior);
		}
	}
	return undefined;
}

/**
 * Default capabilities for a stub implementation.
 * All functions throw NotYetImplementedError.
 */
export function getStubCapabilities(): ImplementationCapabilities {
	return {
		name: "ccl-test-runner-ts-stub",
		version: "0.1.0",
		functions: [], // No functions implemented yet
		features: [], // No features supported yet
		behaviors: [
			"boolean_lenient",
			"crlf_normalize_to_lf",
			"tabs_to_spaces",
			"loose_spacing",
			"list_coercion_disabled",
		],
		variant: "proposed_behavior",
	};
}

/**
 * Create capabilities with common defaults.
 */
export function createCapabilities(
	partial: Partial<ImplementationCapabilities> & { name: string },
): ImplementationCapabilities {
	const defaults = getStubCapabilities();
	return {
		...defaults,
		...partial,
		version: partial.version ?? defaults.version,
	};
}
