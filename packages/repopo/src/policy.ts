import { NoJsFileExtensions } from "./policies/NoJsFileExtensions.js";
import { PackageJsonProperties } from "./policies/PackageJsonProperties.js";
import { PackageJsonRepoDirectoryProperty } from "./policies/PackageJsonRepoDirectoryProperty.js";
import { PackageJsonSortedPolicy } from "./policies/PackageJsonSortedPolicy.js";
import { SortTsconfigs } from "./policies/SortTsconfigs.js";

/**
 * A type representing a policy name.
 *
 * @alpha
 */
export type PolicyName = string;

/**
 * @alpha
 */
export interface PolicyFunctionArguments<C = unknown | undefined> {
	file: string;
	root: string;
	resolve: boolean;
	config?: C;
}

/**
 * A policy handler is a function that is called to check policy against a file.
 *
 * @alpha
 */
export type PolicyHandler<C = unknown | undefined> = (
	args: PolicyFunctionArguments<C>,
) => Promise<true | PolicyFailure | PolicyFixResult>;

// export type PolicyCheckOnly = (
// 	file: string,
// 	root: string,
// ) => Promise<true | PolicyFailure | PolicyFixResult>;

/**
 * A standalone function that can be called to resolve a policy failure.
 *
 * @alpha
 */
export type PolicyStandaloneResolver<C = unknown | undefined> = (
	args: Omit<PolicyFunctionArguments<C>, "resolve">,
) => PolicyFixResult;

// function isPolicyHandler(input: PolicyHandler | PolicyCheckOnly): input is PolicyHandler

/**
 * A RepoPolicy checks and applies policies to files in the repository.
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

// biome-ignore lint/suspicious/noExplicitAny: TODO - figure out if this can work with unknown or in another typesafe manner
export interface RepoPolicy<C = any | undefined> {
	/**
	 * The name of the policy; displayed in UI and used in settings.
	 */
	name: PolicyName;

	/**
	 * A more detailed description of the policy and its intended function.
	 */
	description?: string;

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
	handler: PolicyHandler<C>;

	/**
	 * A resolver function that can be used to automatically address the policy violation.
	 *
	 * @param file - Repo-relative path to the file to check.
	 * @param root - Absolute path to the root of the repo.
	 * @returns true if the file passed the policy; otherwise a PolicyFailure object will be returned.
	 */
	resolver?: PolicyStandaloneResolver<C> | undefined;
}

export class RepoPolicyClass implements RepoPolicy {
	public static createRepoPolicy(
		name: string,
		match: RegExp,
		handler: PolicyHandler,
		resolver?: PolicyStandaloneResolver,
	): RepoPolicyClass {
		return new RepoPolicyClass(name, match, handler, resolver);
	}

	public constructor(
		public readonly name: string,
		public readonly match: RegExp,
		public handler: PolicyHandler,
		public resolver?: PolicyStandaloneResolver,
	) {
		// empty
	}
}

/**
 * A policy failure.
 *
 * @alpha
 */
export interface PolicyFailure {
	name: PolicyName;
	file: string;
	autoFixable?: boolean | undefined;
	errorMessage?: string | undefined;
}

/**
 * @alpha
 */
export interface PolicyFixResult extends PolicyFailure {
	resolved: boolean;
}

// biome-ignore lint/suspicious/noExplicitAny: type guard
export function isPolicyFixResult(toCheck: any): toCheck is PolicyFixResult {
	if (typeof toCheck !== "object") {
		return false;
	}
	return "resolved" in toCheck;
}

// export const commonMatchPatterns = {
// 	"package.json": /(^|\/)package\.json/i,
// } as const;

// export function createPackageJsonPolicy(
// 	props: Omit<RepoPolicy, "match">,
// ): RepoPolicy {
// 	const newPolicy: RepoPolicy = {
// 		...props,
// 		match: commonMatchPatterns["package.json"],
// 	};

// 	return newPolicy;
// }

/**
 * Default policies included with repopo.
 *
 * @alpha
 */
export const DefaultPolicies: RepoPolicy[] = [
	NoJsFileExtensions,
	PackageJsonRepoDirectoryProperty,
	PackageJsonProperties,
	PackageJsonSortedPolicy,
	SortTsconfigs,
];
