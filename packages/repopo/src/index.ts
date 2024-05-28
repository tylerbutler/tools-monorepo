// biome-ignore lint/performance/noBarrelFile: Standard oclif pattern
export { run } from "@oclif/core";

export type {
	RepoPolicy,
	PolicyName,
	PolicyFailure,
	PolicyFixResult,
} from "./policy.js";
export { DefaultPolicies } from "./policy.js";
export type { PolicyConfig } from "./config.js";
export type { PackageJsonPropertiesSettings } from "./policies/PackageJsonProperties.js";
