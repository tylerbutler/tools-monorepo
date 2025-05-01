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

export type {
	// PolicyList,
	RepopoConfig,
} from "./config.js";
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
