import type { Operation } from "effection";
import { NoJsFileExtensions } from "./policies/NoJsFileExtensions.js";
import { PackageJsonRepoDirectoryProperty } from "./policies/PackageJsonRepoDirectoryProperty.js";
import { PackageJsonSorted } from "./policies/PackageJsonSorted.js";

/**
 * A type representing a policy name.
 *
 * @alpha
 */
export type PolicyName = string;

/**
 * Arguments passed to policy handler functions.
 *
 * @alpha
 */
export interface PolicyArgs<C = void> {
	/**
	 * Path to the file, relative to the repo root.
	 */
	file: string;

	/**
	 * Absolute path to the root of the repo.
	 */
	root: string;

	/**
	 * If true, the handler should resolve any violations automatically if possible.
	 */
	resolve: boolean;

	/**
	 * Optional configuration for the policy.
	 */
	config?: C | undefined;
}

/**
 * @deprecated Use {@link PolicyArgs} instead.
 * @alpha
 */
export type PolicyFunctionArguments<C> = PolicyArgs<C>;

// ============================================================================
// New Result Types
// ============================================================================

/**
 * A policy error returned when a file fails a policy check.
 *
 * @alpha
 */
export interface PolicyError {
	/**
	 * The error message describing what failed.
	 */
	error: string;

	/**
	 * Set to `true` if the policy violation can be fixed automatically.
	 */
	fixable?: boolean | undefined;

	/**
	 * Set to `true` if the violation was successfully fixed (only set when resolve=true).
	 */
	fixed?: boolean | undefined;

	/**
	 * An optional string that tells the user how to manually fix the failure.
	 */
	manualFix?: string | undefined;
}

/**
 * The result of a policy handler.
 * Returns `true` if the file passes the policy, or a {@link PolicyError} if it fails.
 *
 * @alpha
 */
export type PolicyResult = true | PolicyError;

// ============================================================================
// Legacy Result Types (Still supported for backward compatibility)
// ============================================================================

/**
 * A policy failure (legacy format).
 *
 * @deprecated Use {@link PolicyError} instead, which has a simpler API.
 *
 * @alpha
 */
export interface PolicyFailure {
	/**
	 * Name of the policy that failed.
	 */
	name: PolicyName;

	/**
	 * Path to the file that failed the policy.
	 */
	file: string;

	/**
	 * Set to `true` if the policy can be fixed automatically.
	 */
	autoFixable?: boolean | undefined;

	/**
	 * An optional error message accompanying the failure.
	 */
	errorMessages: string[];

	/**
	 * An optional string that tells the user how to fix the failure(s).
	 */
	manualFix?: string | undefined;
}

/**
 * The result of an automatic fix for a failing policy (legacy format).
 *
 * @deprecated Use {@link PolicyError} with `fixed: boolean` instead.
 *
 * @alpha
 */
export interface PolicyFixResult extends PolicyFailure {
	/**
	 * Set to true if the failure was resolved by the automated fixer.
	 */
	resolved: boolean;
}

/**
 * Result type that accepts both legacy and new formats.
 *
 * @alpha
 */
export type PolicyHandlerResult =
	| true
	| PolicyFailure
	| PolicyFixResult
	| PolicyError;

// ============================================================================
// Handler Types
// ============================================================================

/**
 * A policy handler function that checks a file against a policy.
 *
 * @remarks
 * Policy handlers can be implemented in two ways:
 * - As an async function returning a Promise
 * - As an Effection generator function returning an Operation
 *
 * Both styles are supported. Async handlers are automatically wrapped for Effection.
 *
 * Handlers can return either the legacy format ({@link PolicyFailure}) or
 * the new format ({@link PolicyError}). The new format is simpler and recommended
 * for new policies.
 *
 * @alpha
 */
export type PolicyHandler<C = unknown | undefined> =
	| ((args: PolicyArgs<C>) => Promise<PolicyHandlerResult>)
	| ((args: PolicyArgs<C>) => Operation<PolicyHandlerResult>);

/**
 * A standalone resolver function that can fix policy violations (legacy format).
 *
 * @deprecated Use {@link PolicyResolver} instead, which uses {@link PolicyError}.
 *
 * @alpha
 */
export type PolicyStandaloneResolver<C = undefined> = (
	args: Omit<PolicyArgs<C>, "resolve">,
) => Promise<PolicyFixResult> | Operation<PolicyFixResult>;

/**
 * A standalone resolver function using the new format.
 *
 * @alpha
 */
export type PolicyResolver<C = void> = (
	args: Omit<PolicyArgs<C>, "resolve">,
) => Promise<PolicyError> | Operation<PolicyError>;

// ============================================================================
// Policy Definition Types
// ============================================================================

/**
 * Interface describing the shape of a policy definition.
 *
 * @typeParam C - Type of configuration object used by the policy
 *
 * @alpha
 */
export interface PolicyShape<C = void> {
	/**
	 * The name of the policy; displayed in UI and used in settings.
	 */
	name: PolicyName;

	/**
	 * A detailed description of the policy and its purpose.
	 */
	description: string;

	/**
	 * A regular expression that matches files this policy applies to.
	 */
	match: RegExp;

	/**
	 * The handler function that checks if a file complies with the policy.
	 */
	handler: PolicyHandler<C>;

	/**
	 * An optional resolver function that can automatically fix violations.
	 */
	resolver?: PolicyStandaloneResolver<C> | undefined;

	/**
	 * A default configuration that will be used if none is provided.
	 */
	defaultConfig?: C | undefined;
}

/**
 * Abstract base class for creating policies with object-based construction.
 *
 * @remarks
 * This class accepts a {@link PolicyShape} object in its constructor,
 * making it easier to add new optional properties in the future without breaking changes.
 *
 * @alpha
 */
export abstract class Policy<C = void> implements PolicyShape<C> {
	public readonly name: string;
	public readonly description: string;
	public readonly match: RegExp;
	public readonly handler: PolicyHandler<C>;
	public readonly defaultConfig?: C | undefined;
	public readonly resolver?: PolicyStandaloneResolver<C> | undefined;

	public constructor(definition: PolicyShape<C>) {
		this.name = definition.name;
		this.description = definition.description;
		this.match = definition.match;
		this.handler = definition.handler;
		this.defaultConfig = definition.defaultConfig;
		this.resolver = definition.resolver;
	}
}

/**
 * @deprecated Use {@link PolicyShape} instead.
 * @alpha
 */
export type PolicyDefinition<C = undefined> = PolicyShape<C>;

/**
 * A policy instance with configuration and exclusion settings applied.
 *
 * @typeParam C - Type of configuration object used by the policy
 *
 * @alpha
 */
export interface ConfiguredPolicy<C = void> extends PolicyShape<C> {
	/**
	 * The configuration applied to this policy instance.
	 */
	config?: C | undefined;

	/**
	 * File paths matching these patterns will be excluded from this policy.
	 * @deprecated Use `excludeFiles` instead for backward compatibility.
	 */
	exclude?: (string | RegExp)[] | undefined;

	/**
	 * File paths matching these patterns will be excluded from this policy.
	 */
	excludeFiles?: (string | RegExp)[] | undefined;

	/**
	 * Internal normalized handler (always an Effection Operation).
	 * This is set by the policy() function and used by the execution engine.
	 * @internal
	 */
	_internalHandler?: (args: PolicyArgs<C>) => Operation<PolicyHandlerResult>;
}

/**
 * Settings for configuring a policy instance.
 * @alpha
 */
export interface PolicyInstanceSettings<C> {
	/**
	 * An array of strings/regular expressions. File paths that match any of these expressions will be completely excluded
	 * from policy.
	 *
	 * Paths will be matched relative to the root of the repo.
	 */
	excludeFiles?: (string | RegExp)[];

	/**
	 * The config that is applied to the policy instance.
	 */
	config?: C | undefined;
}

/**
 * @deprecated Use {@link ConfiguredPolicy} instead.
 * @alpha
 */
export type PolicyInstance<C = undefined> = ConfiguredPolicy<C>;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a result is a {@link PolicyFixResult} (legacy).
 *
 * @deprecated Use {@link isPolicyError} instead when working with the new {@link PolicyError} format.
 *
 * @alpha
 */
// biome-ignore lint/suspicious/noExplicitAny: type guard
export function isPolicyFixResult(toCheck: any): toCheck is PolicyFixResult {
	if (typeof toCheck !== "object" || toCheck === null) {
		return false;
	}
	return "resolved" in toCheck;
}

/**
 * Type guard to check if a result is a PolicyError (new format).
 *
 * @alpha
 */
// biome-ignore lint/suspicious/noExplicitAny: type guard
export function isPolicyError(toCheck: any): toCheck is PolicyError {
	if (typeof toCheck !== "object" || toCheck === null) {
		return false;
	}
	return "error" in toCheck && typeof toCheck.error === "string";
}

/**
 * Type guard to check if a result is a {@link PolicyFailure} (legacy format).
 *
 * @deprecated Use {@link isPolicyError} instead when working with the new {@link PolicyError} format.
 *
 * @alpha
 */
// biome-ignore lint/suspicious/noExplicitAny: type guard
export function isPolicyFailure(toCheck: any): toCheck is PolicyFailure {
	if (typeof toCheck !== "object" || toCheck === null) {
		return false;
	}
	return "errorMessages" in toCheck && Array.isArray(toCheck.errorMessages);
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Converts a legacy PolicyFailure/PolicyFixResult to the new PolicyError format.
 * @internal
 */
export function convertLegacyResult(
	result: PolicyHandlerResult,
	_file: string,
): PolicyResult {
	if (result === true) {
		return true;
	}

	// Check if it's already the new format
	if (isPolicyError(result)) {
		return result;
	}

	// It's a legacy PolicyFailure or PolicyFixResult
	const error = result.errorMessages?.join("; ") ?? "Policy violation";
	const isFixResult = isPolicyFixResult(result);

	return {
		error,
		fixable: result.autoFixable ?? false,
		fixed: isFixResult ? result.resolved : undefined,
		manualFix: result.manualFix,
	};
}

/**
 * Converts a new PolicyError to the legacy PolicyFailure format.
 * @internal
 */
export function convertToLegacyResult(
	result: PolicyError,
	policyName: string,
	file: string,
): PolicyFailure | PolicyFixResult {
	const base: PolicyFailure = {
		name: policyName,
		file,
		autoFixable: result.fixable,
		errorMessages: [result.error],
		manualFix: result.manualFix,
	};

	if (result.fixed !== undefined) {
		return {
			...base,
			resolved: result.fixed,
		} satisfies PolicyFixResult;
	}

	return base;
}

// ============================================================================
// Default Policies
// ============================================================================

/**
 * Default policies included with repopo.
 *
 * @alpha
 */
// biome-ignore lint/suspicious/noExplicitAny: FIXME
export const DefaultPolicies: Policy<any>[] = [
	NoJsFileExtensions,
	PackageJsonRepoDirectoryProperty,
	PackageJsonSorted,
] as const;
