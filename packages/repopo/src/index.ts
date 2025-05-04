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
	PolicyDefinition,
} from "./policy.js";

export type {
	// PolicyList,
	RepopoConfig,
} from "./config.js";
export { makePolicy } from "./makePolicy.js";
export {
	definePackagePolicy as generatePackagePolicy,
	type PackageJsonHandler,
} from "./policyDefiners/definePackagePolicy.js";
export {
	defineFileHeaderPolicy as generateFileHeaderPolicy,
	type FileHeaderGeneratorConfig,
	type FileHeaderPolicyConfig,
} from "./policyDefiners/defineFileHeaderPolicy.js";
