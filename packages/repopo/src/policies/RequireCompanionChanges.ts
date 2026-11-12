import { exclusionRegex, matchesPath } from "../context.js";
import type { RepositoryPolicyDefinition } from "../policy.js";

/** Explicit repo-relative regexes for one change implication. @public */
export interface RequireCompanionChangesConfig {
	trigger: string | RegExp;
	companion: string | RegExp;
}

function compilePattern(value: unknown): RegExp {
	if (typeof value !== "string" && !(value instanceof RegExp)) {
		throw new TypeError(
			"Trigger and companion must be regex strings or RegExp values.",
		);
	}
	return exclusionRegex(value);
}

/** Require a related update when trigger paths change. @public */
export const RequireCompanionChanges = {
	name: "RequireCompanionChanges",
	description: "Requires a related file change when trigger paths change.",
	scope: "repository",
	requiresChanges: true,
	requiresConfig: true,
	handler: async ({ entries, config }) => {
		if (!config) {
			throw new TypeError("RequireCompanionChanges requires config.");
		}
		const trigger = compilePattern(config.trigger);
		const companion = compilePattern(config.companion);
		const triggers = [
			...new Set(
				entries
					.filter((entry) => entry.status !== "unchanged")
					.flatMap((entry) =>
						(entry.status === "renamed"
							? [entry.previousPath, entry.path]
							: [entry.path]
						).filter((path) => matchesPath(trigger, path)),
					),
			),
		];
		if (
			triggers.length === 0 ||
			entries.some(
				(entry) =>
					entry.status !== "unchanged" &&
					entry.status !== "deleted" &&
					matchesPath(companion, entry.path),
			)
		) {
			return [];
		}
		return [
			{
				message: `Changes matching ${trigger} require a companion change matching ${companion}.`,
				files: triggers,
				manualFix:
					"Add, update, or rename a file into the companion pattern in the same change set. Deletions do not satisfy this rule.",
			},
		];
	},
} satisfies RepositoryPolicyDefinition<RequireCompanionChangesConfig>;
