import type {
	ReleaseGroupName,
	WorkspaceName,
} from '@tylerbu/sail-infrastructure';
import { Flags } from "@oclif/core";

export const ReleaseGroupNameFlag = Flags.custom<ReleaseGroupName>({
	required: false,
	description: "The name of a release group.",
	char: "g",
	parse: async (input) => {
		return input as ReleaseGroupName;
	},
	exclusive: ["all", "workspace"],
});

export const WorkspaceNameFlag = Flags.custom<WorkspaceName>({
	required: false,
	description: "The name of a release group.",
	char: "w",
	parse: async (input) => {
		return input as WorkspaceName;
	},
	exclusive: ["all", "releaseGroup"],
});

export const selectionFlags = {
	all: Flags.boolean({
		description: "Run tasks for all packages.",
		exclusive: ["releaseGroup", "workspace"],
	}),
	releaseGroup: ReleaseGroupNameFlag(),
	workspace: WorkspaceNameFlag(),
};

/**
 * Shared cache flags for build commands.
 */
export const cacheFlags = {
	cacheDir: Flags.string({
		description: "Path to shared cache directory.",
		env: "SAIL_CACHE_DIR",
	}),
	skipCacheWrite: Flags.boolean({
		description: "Read from cache but don't write to it (read-only mode).",
		default: false,
	}),
	verifyCacheIntegrity: Flags.boolean({
		description: "Verify file hashes when restoring from cache (adds overhead).",
		default: false,
	}),
	cacheStats: Flags.boolean({
		description: "Display cache statistics after build.",
		default: false,
	}),
	cacheClean: Flags.boolean({
		description: "Remove all cache entries.",
		default: false,
	}),
	cachePrune: Flags.boolean({
		description: "Prune old cache entries based on age and size limits.",
		default: false,
	}),
	cacheVerify: Flags.boolean({
		description: "Verify cache integrity (check for corruption).",
		default: false,
	}),
	cacheVerifyFix: Flags.boolean({
		description: "Fix corrupted cache entries.",
		default: false,
	}),
};
