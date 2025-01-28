export { run } from "@oclif/core";

export type {
	PolicyFailure,
	PolicyFixResult,
	PolicyFunctionArguments,
	PolicyHandler,
	PolicyName,
	PolicyStandaloneResolver,
	RepoPolicy,
} from "./policy.js";
export { DefaultPolicies } from "./policy.js";
export type {
	PerPolicySettings,
	RepopoConfig,
} from "./config.js";
export type {
	PackageJsonPropertiesSettings,
	PackageJsonProperty,
} from "./policies/PackageJsonProperties.js";
