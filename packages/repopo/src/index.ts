export { run } from "@oclif/core";

export type {
	DefaultPolicyConfigType,
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
	PropertySetter,
	PropertySetterObject,
} from "./policies/PackageJsonProperties.js";
