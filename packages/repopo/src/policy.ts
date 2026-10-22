import type { Operation } from "effection";
import { NoJsFileExtensions } from "./policies/NoJsFileExtensions.js";
import { PackageJsonRepoDirectoryProperty } from "./policies/PackageJsonRepoDirectoryProperty.js";
import { PackageJsonSorted } from "./policies/PackageJsonSorted.js";

/** Display name of a policy. @public */
export type PolicyName = string;
/** Stable configured-instance identity. @public */
export type PolicyInstanceId = string;

/** Arguments supplied to a file handler. @public */
export interface PolicyArgs<C = void> {
	file: string;
	root: string;
	resolve: boolean;
	config?: C | undefined;
}

/** Arguments supplied to a repository handler; selection never limits files. @public */
export interface RepositoryPolicyArgs<C = void>
	extends Omit<PolicyArgs<C>, "file"> {
	files: readonly string[];
}

/** A single independently actionable violation or recorded fix. @public */
export interface PolicyFinding {
	message: string;
	manualFix?: string | undefined;
	fixStatus?: "available" | "fixed" | "failed" | undefined;
	/** Repo-relative affected files. Only repository handlers may supply this. */
	files?: readonly string[] | undefined;
}

/** Empty means pass. Fixed findings remain visible. @public */
export type PolicyResult = readonly PolicyFinding[];

/** Standalone file fixers receive and return the complete findings list. @public */
export type PolicyResolver<C = void> = {
	resolve(
		args: Omit<PolicyArgs<C>, "resolve"> & { findings: PolicyResult },
	): Promise<PolicyResult> | Operation<PolicyResult>;
}["resolve"];

/** File scope is the default. @public */
export interface FilePolicyDefinition<C = void> {
	name: PolicyName;
	description: string;
	scope?: "file";
	match: RegExp;
	handler(args: PolicyArgs<C>): Promise<PolicyResult> | Operation<PolicyResult>;
	resolver?: PolicyResolver<C> | undefined;
	defaultConfig?: C | undefined;
	requiresConfig?: boolean | undefined;
}

/** Repository scope is explicit; repository fixers are inline only. @public */
export interface RepositoryPolicyDefinition<C = void> {
	name: PolicyName;
	description: string;
	scope: "repository";
	handler(
		args: RepositoryPolicyArgs<C>,
	): Promise<PolicyResult> | Operation<PolicyResult>;
	resolver?: never;
	defaultConfig?: C | undefined;
	requiresConfig?: boolean | undefined;
}

/** A canonical policy definition. @public */
export type PolicyDefinition<C = void> =
	| FilePolicyDefinition<C>
	| RepositoryPolicyDefinition<C>;

/** Async and Effection file handlers are supported. @public */
export type PolicyHandler<C = void> = FilePolicyDefinition<C>["handler"];
/** Async and Effection repository handlers are supported. @public */
export type RepositoryPolicyHandler<C = void> =
	RepositoryPolicyDefinition<C>["handler"];

/** Instance configuration and repo-relative regex exclusions. @public */
export interface PolicyOptions<C = void> {
	config?: C | undefined;
	exclude?: readonly (string | RegExp)[] | undefined;
	instanceId?: PolicyInstanceId | undefined;
}

/** A configured file policy. @public */
export type ConfiguredFilePolicy<C = void> = FilePolicyDefinition<C> &
	PolicyOptions<C>;
/** A configured repository policy. @public */
export type ConfiguredRepositoryPolicy<C = void> =
	RepositoryPolicyDefinition<C> & PolicyOptions<C>;
/** A configured policy, retaining scope discrimination. @public */
export type ConfiguredPolicy<C = unknown> =
	| ConfiguredFilePolicy<C>
	| ConfiguredRepositoryPolicy<C>;
/** A configured policy with a validated stable identity. @public */
export type IdentifiedPolicy<C = unknown> = ConfiguredPolicy<C> & {
	instanceId: PolicyInstanceId;
};

/** The default definitions, configured when no policies are supplied. @public */
export const DefaultPolicies = [
	NoJsFileExtensions,
	PackageJsonRepoDirectoryProperty,
	PackageJsonSorted,
] as const;
