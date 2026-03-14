export type { Capability, CapabilityWrapper } from "./capability.js";
// biome-ignore lint/performance/noBarrelFile: Intentional barrel file for capabilities module public API - required for @tylerbu/cli-api/capabilities subpath export
export {
	ConfigCapability,
	type ConfigCapabilityOptions,
	type ConfigContext,
	type ConfigContextFound,
	type ConfigContextNotFound,
	DEFAULT_CONFIG_LOCATION,
	type DefaultConfigLocation,
	useConfig,
} from "./config.js";
export {
	GitCapability,
	type GitCapabilityOptions,
	type GitContext,
	type GitContextInRepo,
	type GitContextNoRepo,
	useGit,
} from "./git.js";
