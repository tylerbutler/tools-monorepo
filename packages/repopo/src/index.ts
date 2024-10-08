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
	PolicyConfig,
	PerPolicySettings,
} from "./config.js";
export type {
	PackageJsonPropertiesSettings,
	PackageJsonProperty,
} from "./policies/PackageJsonProperties.js";
