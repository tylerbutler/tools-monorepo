export { run } from "@oclif/core";
export type {
	// PolicyList,
	RepopoConfig,
} from "./config.ts";
export { makePolicy } from "./makePolicy.ts";
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
} from "./policy.ts";
export {
	defineFileHeaderPolicy as generateFileHeaderPolicy,
	type FileHeaderGeneratorConfig,
	type FileHeaderPolicyConfig,
} from "./policyDefiners/defineFileHeaderPolicy.ts";
export {
	definePackagePolicy as generatePackagePolicy,
	type PackageJsonHandler,
} from "./policyDefiners/definePackagePolicy.ts";
