export { run } from "@oclif/core";
export type {
	// PolicyList,
	RepopoConfig,
} from "./config.js";
export { makePolicy } from "./makePolicy.js";
export {
	PackageJsonProperties,
	type PackageJsonPropertiesSettings,
} from "./policies/PackageJsonProperties.js";
export { PackageJsonRepoDirectoryProperty } from "./policies/PackageJsonRepoDirectoryProperty.js";
export { PackageJsonSorted } from "./policies/PackageJsonSorted.js";
export { PackageReadmeExists } from "./policies/PackageReadmeExists.js";
export { PackageScripts } from "./policies/PackageScripts.js";
export type {
	PolicyDefinition,
	PolicyFailure,
	PolicyFixResult,
	PolicyFunctionArguments,
	PolicyHandler,
	PolicyHandlerResult,
	PolicyInstance,
	PolicyInstanceSettings,
	PolicyName,
	PolicyStandaloneResolver,
} from "./policy.js";

export {
	defineFileHeaderPolicy,
	type FileHeaderGeneratorConfig,
	type FileHeaderPolicyConfig,
} from "./policyDefiners/defineFileHeaderPolicy.js";
export {
	definePackagePolicy,
	type PackageJsonHandler,
} from "./policyDefiners/definePackagePolicy.js";
