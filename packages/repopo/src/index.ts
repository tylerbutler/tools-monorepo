/**
 * A tool for enforcing repository policies and standards across codebases.
 *
 * @remarks
 * Repopo provides a framework for defining and enforcing policies across repositories,
 * such as file headers, package.json consistency, and other code standards.
 * It can be used as a CLI tool or integrated into CI/CD pipelines.
 *
 * @packageDocumentation
 */

export { run } from "@oclif/core";
export {
	type FluidAdapterOptions,
	type FluidHandler,
	fromFluidHandlers,
} from "./adapters/fluidFramework.js";
export type {
	// PolicyList,
	RepopoConfig,
} from "./config.js";
export {
	makePolicy,
	makePolicyDefinition,
	type PolicyDefinitionInput,
	type PolicyOptions,
	policy,
} from "./makePolicy.js";
export {
	type ConfiguredPolicy,
	// Type guards
	isPolicyError,
	isPolicyFailure,
	isPolicyFixResult,
	// New types
	Policy,
	type PolicyArgs,
	// Legacy types (for backward compatibility)
	type PolicyDefinition,
	type PolicyError,
	type PolicyFailure,
	type PolicyFixResult,
	type PolicyFunctionArguments,
	type PolicyHandler,
	type PolicyHandlerResult,
	type PolicyInstance,
	type PolicyInstanceSettings,
	type PolicyName,
	type PolicyResolver,
	type PolicyResult,
	type PolicyShape,
	type PolicyStandaloneResolver,
} from "./policy.js";
export {
	type DefineFileHeaderPolicyArgs,
	defineFileHeaderPolicy,
	type FileHeaderGeneratorConfig,
	type FileHeaderPolicyConfig,
} from "./policyDefiners/defineFileHeaderPolicy.js";
export {
	type DefinePackagePolicyArgs,
	definePackagePolicy as generatePackagePolicy,
	type PackageJsonHandler,
} from "./policyDefiners/definePackagePolicy.js";
