export { run } from "@oclif/core";

export type {
	PolicyDefinition,
	PolicyDefinitionAsync,
	PolicyFailure,
	PolicyFixResult,
	PolicyFunctionArguments,
	PolicyHandler,
	PolicyHandlerAsync,
	PolicyHandlerResult,
	PolicyInstance,
	PolicyInstanceSettings,
	PolicyName,
	PolicyStandaloneResolver,
} from "./policy.js";

export type { RepopoConfig } from "./config.js";
export { makePolicy } from "./makePolicy.js";
export {
	definePackagePolicy,
	type PackageJsonHandler,
} from "./policyDefiners/definePackagePolicy.js";
export {
	defineFileHeaderPolicy,
	type FileHeaderGeneratorConfig,
	type FileHeaderPolicyConfig,
} from "./policyDefiners/defineFileHeaderPolicy.js";
