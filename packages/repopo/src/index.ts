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
export type { RepopoConfig } from "./config.js";
export { makePolicy } from "./makePolicy.js";
export type {
	PolicyDefinition,
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
export {
	defineFileHeaderPolicy,
	type FileHeaderGeneratorConfig,
	type FileHeaderPolicyConfig,
} from "./policyDefiners/defineFileHeaderPolicy.js";
export {
	definePackagePolicy,
	type PackageJsonHandler,
} from "./policyDefiners/definePackagePolicy.js";
