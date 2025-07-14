import type { Operation } from "effection";
import type { RequireExactlyOne } from "type-fest";
import { NoJsFileExtensions } from "./policies/NoJsFileExtensions.js";
import { PackageJsonRepoDirectoryProperty } from "./policies/PackageJsonRepoDirectoryProperty.js";
import { PackageJsonSorted } from "./policies/PackageJsonSorted.js";
import { PackageScripts } from "./policies/PackageScripts.js";

/**
 * A type representing a policy name.
 *
 * @alpha
 */
export type PolicyName = string;

/**
 * Arguments passed to policy functions.
 *
 * @alpha
 */

export interface PolicyFunctionArguments<C> {
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
	 * @remarks
	 *
	 * Note that the handler function receives the config as an argument.
	 */
	config?: C | undefined;
}

/**
 * A policy handler is a function that is called to check policy against a file.
 *
 * @alpha
 */
export type PolicyHandler<T, C = unknown | undefined> =
	| ((args: PolicyFunctionArguments<C>) => PolicyHandlerResult)
	| ((args: PolicyFunctionArguments<C>) => Operation<T>)
	| ((args: PolicyFunctionArguments<C>) => Promise<T>);

/**
 * A policy handler async function that is called to check policy against a file.
 *
 * @alpha
 */
export type PolicyHandlerAsync<C = unknown | undefined> = (
	args: PolicyFunctionArguments<C>,
) => Promise<PolicyHandlerResult>;

/**
 * A standalone function that can be called to resolve a policy failure.
 *
 * @alpha
 */
export type PolicyStandaloneResolver<C = undefined> = (
	args: Omit<PolicyFunctionArguments<C>, "resolve">,
) => Operation<PolicyFixResult>;

/**
 * A RepoPolicyDefinition checks and applies policies to files in the repository.
 *
 * Each policy has a name and a match regex for matching which files it should apply to. Every file in th repo is
 * enumerated and if it matches the regex for a policy, that policy is applied.
 *
 * Each policy includes a handler function that checks a file against the policy and can optionally resolve any problems
 * (automated resolutions depend on the policy implementation).
 *
 * @typeParam C - type of configuration object used by the policy
 *
 * @alpha
 */
export interface PolicyDefinition<C = undefined> {
	/**
	 * The name of the policy; displayed in UI and used in settings.
	 */
	name: PolicyName;

	/**
	 * A more detailed description of the policy and its intended function.
	 */
	description?: string | undefined;

	/**
	 * A regular expression that is used to match files in the repo.
	 */
	match: RegExp;

	/**
	 * A handler function that checks if a file is compliant with the policy.
	 *
	 * @param file - Repo-relative path to the file to check.
	 * @param root - Absolute path to the root of the repo.
	 * @param resolve - If true, automated policy fixes will be applied. Not all policies support automated fixes.
	 * @returns True if the file passed the policy; otherwise a PolicyFailure object will be returned.
	 */

	handler: PolicyHandler<PolicyHandlerResult, C>;

	/**
	 * A resolver function that can be used to automatically address the policy violation.
	 *
	 * @param file - Repo-relative path to the file to check.
	 * @param root - Absolute path to the root of the repo.
	 * @returns true if the file passed the policy; otherwise a PolicyFailure object will be returned.
	 */
	resolver?: PolicyStandaloneResolver<C> | undefined;

	/**
	 * A default config that will be used if none is provided.
	 */
	defaultConfig?: C | undefined;
}

/**
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
 * @alpha
 */
export type PolicyInstance<C = undefined> = RequireExactlyOne<
	PolicyDefinition<C> & PolicyInstanceSettings<C>,
	"handler"
>;

/**
 * A policy failure.
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
	errorMessage?: string | undefined;
}

/**
 * The result of an automatic fix for a failing policy.
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
 * @alpha
 */
export type PolicyHandlerResult = true | PolicyFailure | PolicyFixResult;

// biome-ignore lint/suspicious/noExplicitAny: type guard
export function isPolicyFixResult(toCheck: any): toCheck is PolicyFixResult {
	if (typeof toCheck !== "object") {
		return false;
	}
	return "resolved" in toCheck;
}

/**
 * Default policies included with repopo.
 *
 * @alpha
 */

// biome-ignore lint/suspicious/noExplicitAny: FIXME
export const DefaultPolicies: PolicyDefinition<any>[] = [
	NoJsFileExtensions,
	PackageJsonRepoDirectoryProperty,
	PackageJsonSorted,
	PackageScripts,
] as const;

export abstract class Policy<C> implements PolicyDefinition<C> {
	public constructor(
		public readonly name: string,
		public readonly match: RegExp,
		public readonly handler: PolicyHandler<PolicyHandlerResult, C>,
		public readonly description?: string,
		public readonly defaultConfig?: C,
		public readonly resolver?: PolicyStandaloneResolver<C>,
	) {}
}
