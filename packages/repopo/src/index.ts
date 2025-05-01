export { run } from "@oclif/core";

export type {
	PolicyFailure,
	PolicyFixResult,
	PolicyFunctionArguments,
	PolicyHandler,
	PolicyInstance,
	PolicyInstanceSettings,
	PolicyHandlerResult,
	PolicyName,
	PolicyStandaloneResolver,
	PolicyDefinition as RepoPolicyDefinition,
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
	// PolicyList,
	RepopoConfig,
} from "./config.js";
// export type {
// 	PolicyCreator,
// 	PolicyCreatorConstructor,
// 	PolicyCreatorFunction,
// } from "./generators.js";
export { makePolicy } from "./policyGenerators/generatePolicy.js";
export {
	generatePackagePolicy,
	type PackageJsonHandler,
} from "./policyGenerators/generatePackagePolicy.js";
export {
	generateFileHeaderPolicy,
	type FileHeaderGeneratorConfig,
	type FileHeaderPolicyConfig,
} from "./policyGenerators/generateFileHeaderPolicy.js";
