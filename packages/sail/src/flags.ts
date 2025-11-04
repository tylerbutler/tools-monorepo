import { Flags } from "@oclif/core";
import type {
	ReleaseGroupName,
	WorkspaceName,
} from "@tylerbu/sail-infrastructure";

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
 * Management operations (stats, clean, prune, verify) have been moved to the `cache` subcommand.
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
		description:
			"Verify file hashes when restoring from cache (adds overhead).",
		default: false,
	}),
};
