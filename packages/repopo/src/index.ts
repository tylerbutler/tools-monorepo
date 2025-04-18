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
export { DefaultPolicies, type PackageJsonHandler } from "./policy.js";
export { JsTsFileHeaders } from "./policies/JsTsFileHeaders.js";
export { NoJsFileExtensions } from "./policies/NoJsFileExtensions.js";
export { PackageJsonProperties } from "./policies/PackageJsonProperties.js";
export { PackageJsonRepoDirectoryProperty } from "./policies/PackageJsonRepoDirectoryProperty.js";
export { PackageJsonSorted } from "./policies/PackageJsonSorted.js";
export { PackageScripts } from "./policies/PackageScripts.js";
export { SortTsconfigs } from "./policies/SortTsconfigs.js";

export type {
	PerPolicySettings,
	RepopoConfig,
} from "./config.js";
export type { PackageJsonPropertiesSettings } from "./policies/PackageJsonProperties.js";
export { generatePackagePolicy } from "./policyGenerators/generatePackagePolicy.js";
export {
	generateFileHeaderPolicy,
	type FileHeaderGeneratorConfig,
	type FileHeaderPolicyConfig,
} from "./policyGenerators/generateFileHeaderPolicy.js";
