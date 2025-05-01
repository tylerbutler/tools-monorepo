export { run } from "@oclif/core";

export type {
	DefaultPolicyConfigType,
	PackageJsonHandler,
	PolicyFailure,
	PolicyFixResult,
	PolicyFunctionArguments,
	PolicyHandler,
	PolicyHandlerResult,
	PolicyName,
	PolicyStandaloneResolver,
	RepoPolicy,
} from "./policy.js";
export { DefaultPolicies } from "./policy.js";
export { JsTsFileHeaders } from "./policies/JsTsFileHeaders.js";
export { NoJsFileExtensions } from "./policies/NoJsFileExtensions.js";
export {
	PackageJsonProperties,
	type PackageJsonPropertiesSettings,
} from "./policies/PackageJsonProperties.js";
export { PackageJsonRepoDirectoryProperty } from "./policies/PackageJsonRepoDirectoryProperty.js";
export { PackageJsonSorted } from "./policies/PackageJsonSorted.js";
export { PackageScripts } from "./policies/PackageScripts.js";

export type {
	PerPolicySettings,
	RepopoConfig,
} from "./config.js";
export { generatePackagePolicy } from "./policyGenerators/generatePackagePolicy.js";
export {
	generateFileHeaderPolicy,
	type FileHeaderGeneratorConfig,
	type FileHeaderPolicyConfig,
} from "./policyGenerators/generateFileHeaderPolicy.js";
