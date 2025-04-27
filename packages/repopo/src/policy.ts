import { HtmlFileHeaders } from "./policies.js";
import { JsTsFileHeaders } from "./policies/JsTsFileHeaders.js";
import { NoJsFileExtensions } from "./policies/NoJsFileExtensions.js";
import { PackageJsonProperties } from "./policies/PackageJsonProperties.js";
import { PackageJsonRepoDirectoryProperty } from "./policies/PackageJsonRepoDirectoryProperty.js";
import { PackageScripts } from "./policies/PackageScripts.js";

/**
 * @alpha
 */
// export type DefaultPolicyConfigType = Record<string, unknown> | undefined; // AnyObjectOrEmpty
export type DefaultPolicyConfigType = undefined; // AnyObjectOrEmpty

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
export type PolicyStandaloneResolver<C = DefaultPolicyConfigType | undefined> =
	(
		args: Omit<PolicyFunctionArguments<C>, "resolve">,
	) => Promise<PolicyFixResult>;

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
export interface RepoPolicy<C = undefined> {
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

/**
 * A policy handler especially for policies that target package.json.
 *
 * @alpha
 */
export type PackageJsonHandler<J, C> = (
	json: J,
	args: PolicyFunctionArguments<C>,
) => Promise<true | PolicyFailure | PolicyFixResult>;

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
export const DefaultPolicies: RepoPolicy<any>[] = [
	HtmlFileHeaders,
	JsTsFileHeaders,
	NoJsFileExtensions,
	PackageJsonRepoDirectoryProperty,
	PackageJsonProperties,
	// PackageJsonSorted,
	PackageScripts,
] as const;
