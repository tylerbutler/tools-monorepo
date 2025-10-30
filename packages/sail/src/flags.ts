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
