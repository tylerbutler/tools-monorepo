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

export {
	type FluidAdapterOptions,
	type FluidHandler,
	fromFluidHandlers,
} from "./adapters/fluidFramework.js";
export type {
	// PolicyList,
	RepopoConfig,
} from "./config.js";
export { makePolicy } from "./makePolicy.js";
export type { PolicyAction, PolicyHandlerPerfStats } from "./perf.js";
export type { CargoLicenceValidatedConfig } from "./policies/CargoLicenceValidated.js";
export type { CargoLintsConfiguredConfig } from "./policies/CargoLintsConfigured.js";
export type { CargoLockPolicyConfig } from "./policies/CargoLockPolicy.js";
export type { CargoTomlRequiredConfig } from "./policies/CargoTomlRequired.js";
export type { CargoTomlSortedConfig } from "./policies/CargoTomlSorted.js";
export type {
	ConditionalScriptEntry,
	ConditionalScriptRule,
	ConditionalScriptsConfig,
} from "./policies/ConditionalScripts.js";
export type { ExactScriptsConfig } from "./policies/ExactScripts.js";
export type { GleamDepVersionsConfig } from "./policies/GleamDepVersions.js";
export type { GleamDocExistsConfig } from "./policies/GleamDocExists.js";
export type { GleamInternalModulesConfiguredConfig } from "./policies/GleamInternalModulesConfigured.js";
export type { GleamLicenceConfiguredConfig } from "./policies/GleamLicenceConfigured.js";
export type { GleamMonorepoConsistencyConfig } from "./policies/GleamMonorepoConsistency.js";
export type { GleamNameRestrictionsConfig } from "./policies/GleamNameRestrictions.js";
export type { GleamNoPathDepsInPublishedConfig } from "./policies/GleamNoPathDepsInPublished.js";
export type { GleamProjectStructureConfig } from "./policies/GleamProjectStructure.js";
export type { GleamSharedDependencyVersionsConfig } from "./policies/GleamSharedDependencyVersions.js";
export type { GleamTomlRequiredConfig } from "./policies/GleamTomlRequired.js";
export type { GleamTomlSortedConfig } from "./policies/GleamTomlSorted.js";
export type { GleamVersionConstraintConfig } from "./policies/GleamVersionConstraint.js";
export type { LicenseFileExistsSettings } from "./policies/LicenseFileExists.js";
export type { MutuallyExclusiveScriptsConfig } from "./policies/MutuallyExclusiveScripts.js";
export type { NoLargeBinaryFilesSettings } from "./policies/NoLargeBinaryFiles.js";
export type { NoPrivateWorkspaceDependenciesSettings } from "./policies/NoPrivateWorkspaceDependencies.js";
export type { NoUnsafeWithoutJustificationConfig } from "./policies/NoUnsafeWithoutJustification.js";
export type { NoWildcardDependenciesConfig } from "./policies/NoWildcardDependencies.js";
export type { PackageAllowedScopesConfig } from "./policies/PackageAllowedScopes.js";
export type { PackageEsmTypeConfig } from "./policies/PackageEsmType.js";
export type { PackageFolderNameConfig } from "./policies/PackageFolderName.js";
export type { PackageJsonPropertiesSettings } from "./policies/PackageJsonProperties.js";
export type { PackageLicenseSettings } from "./policies/PackageLicense.js";
export type { PackagePrivateFieldConfig } from "./policies/PackagePrivateField.js";
export type { PackageReadmeSettings } from "./policies/PackageReadme.js";
export type {
	PackageScriptsSettings,
	ScriptMustContainRule,
} from "./policies/PackageScripts.js";
export type { PackageTestScriptsConfig } from "./policies/PackageTestScripts.js";
export type { PublicApiDocumentedConfig } from "./policies/PublicApiDocumented.js";
export type { RequiredGitignorePatternsSettings } from "./policies/RequiredGitignorePatterns.js";
export type {
	RequiredScriptEntry,
	RequiredScriptsConfig,
} from "./policies/RequiredScripts.js";
export type { RustDocExistsConfig } from "./policies/RustDocExists.js";
export type { RustfmtConfigExistsConfig } from "./policies/RustfmtConfigExists.js";
export type { RustToolchainExistsConfig } from "./policies/RustToolchainExists.js";
export type {
	ScriptContainsConfig,
	ScriptContainsRule,
} from "./policies/ScriptContains.js";
export type { SharedDependencyVersionsConfig } from "./policies/SharedDependencyVersions.js";
export type { WorkspaceInheritanceConfig } from "./policies/WorkspaceInheritance.js";
export type { WorkspaceMembersValidConfig } from "./policies/WorkspaceMembersValid.js";
export type {
	ConfiguredFilePolicy,
	ConfiguredPolicy,
	ConfiguredRepositoryPolicy,
	FilePolicyDefinition,
	IdentifiedPolicy,
	PolicyArgs,
	PolicyDefinition,
	PolicyFinding,
	PolicyHandler,
	PolicyInstanceId,
	PolicyName,
	PolicyOptions,
	PolicyResolver,
	PolicyResult,
	RepositoryPolicyArgs,
	RepositoryPolicyDefinition,
	RepositoryPolicyHandler,
} from "./policy.js";
export {
	type CargoToml,
	type CargoTomlHandler,
	type DefineCargoPolicyArgs,
	defineCargoPolicy,
} from "./policyDefiners/defineCargoPolicy.js";
export {
	type DefineFileHeaderPolicyArgs,
	defineFileHeaderPolicy,
	type FileHeaderGeneratorConfig,
	type FileHeaderPolicyConfig,
} from "./policyDefiners/defineFileHeaderPolicy.js";
export {
	type DefineGleamPolicyArgs,
	defineGleamPolicy,
	type GleamToml,
	type GleamTomlHandler,
} from "./policyDefiners/defineGleamPolicy.js";
export {
	type DefinePackagePolicyArgs,
	definePackagePolicy,
	type PackageJsonHandler,
} from "./policyDefiners/definePackagePolicy.js";
export {
	type PolicyExecutionError,
	type PolicyRunFinding,
	PolicyRunner,
	type PolicyRunnerOptions,
	type PolicyRunResults,
	type PolicySkippedWork,
	type RepositoryInventory,
	runPolicies,
} from "./runner.js";
