import type { RepositoryPolicyDefinition } from "../policy.js";

/** Configuration for the changed-file limit. @public */
export interface MaxChangedFilesConfig {
	/** Maximum number of eligible changed files; must be a nonnegative integer. */
	maxFiles: number;
}

/** Limit the number of files in the selected change set. @public */
export const MaxChangedFiles = {
	name: "MaxChangedFiles",
	description: "Limits the number of changed files in a change set.",
	scope: "changes",
	requiresConfig: true,
	handler: async ({ entries, config }) => {
		if (!(config && Number.isInteger(config.maxFiles)) || config.maxFiles < 0) {
			throw new TypeError(
				"MaxChangedFiles requires maxFiles to be a nonnegative integer.",
			);
		}
		const count = entries.filter(
			(entry) => entry.status !== "unchanged",
		).length;
		return count > config.maxFiles
			? [
					{
						message: `Change set contains ${count} changed files; maximum allowed is ${config.maxFiles}.`,
						manualFix:
							"Reduce the number of changed files or split the change into smaller change sets.",
					},
				]
			: [];
	},
} satisfies RepositoryPolicyDefinition<MaxChangedFilesConfig>;
