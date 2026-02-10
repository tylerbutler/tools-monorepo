// New focused script policies (replacements for PackageScripts)
// biome-ignore lint/performance/noBarrelFile: intentional public API entry point for policies
export {
	type ConditionalScriptEntry,
	type ConditionalScriptRule,
	ConditionalScripts,
	type ConditionalScriptsConfig,
} from "./policies/ConditionalScripts.js";
export {
	ExactScripts,
	type ExactScriptsConfig,
} from "./policies/ExactScripts.js";
// File header policies
export { HtmlFileHeaders } from "./policies/HtmlFileHeaders.js";
export { JsTsFileHeaders } from "./policies/JsTsFileHeaders.js";
// License policies
export { LicenseFileExists } from "./policies/LicenseFileExists.js";
export {
	MutuallyExclusiveScripts,
	type MutuallyExclusiveScriptsConfig,
} from "./policies/MutuallyExclusiveScripts.js";
// File extension policies
export { NoJsFileExtensions } from "./policies/NoJsFileExtensions.js";
// File size policies
export { NoLargeBinaryFiles } from "./policies/NoLargeBinaryFiles.js";
// Dependency policies
export { NoPrivateWorkspaceDependencies } from "./policies/NoPrivateWorkspaceDependencies.js";
// Package naming policies
export {
	PackageAllowedScopes,
	type PackageAllowedScopesConfig,
} from "./policies/PackageAllowedScopes.js";
// Package type policies
export {
	PackageEsmType,
	type PackageEsmTypeConfig,
} from "./policies/PackageEsmType.js";
export {
	PackageFolderName,
	type PackageFolderNameConfig,
} from "./policies/PackageFolderName.js";
// Package.json field policies
export { PackageJsonProperties } from "./policies/PackageJsonProperties.js";
export { PackageJsonRepoDirectoryProperty } from "./policies/PackageJsonRepoDirectoryProperty.js";
export { PackageJsonSorted } from "./policies/PackageJsonSorted.js";
export {
	PackageLicense,
	type PackageLicenseSettings,
} from "./policies/PackageLicense.js";
export {
	PackagePrivateField,
	type PackagePrivateFieldConfig,
} from "./policies/PackagePrivateField.js";
// Package readme policies
export {
	PackageReadme,
	type PackageReadmeSettings,
} from "./policies/PackageReadme.js";
// Package script policies (legacy - prefer focused policies above)
export {
	type ConditionalScriptRule as LegacyConditionalScriptRule,
	PackageScripts,
	type PackageScriptsSettings,
	type RequiredScriptEntry as LegacyRequiredScriptEntry,
	type ScriptMustContainRule,
} from "./policies/PackageScripts.js";
export {
	PackageTestScripts,
	type PackageTestScriptsConfig,
} from "./policies/PackageTestScripts.js";
// Gitignore policies
export { RequiredGitignorePatterns } from "./policies/RequiredGitignorePatterns.js";
export {
	type RequiredScriptEntry,
	RequiredScripts,
	type RequiredScriptsConfig,
} from "./policies/RequiredScripts.js";
export {
	ScriptContains,
	type ScriptContainsConfig,
	type ScriptContainsRule,
} from "./policies/ScriptContains.js";

// Default policies
export { DefaultPolicies } from "./policy.js";
