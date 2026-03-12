import { readFile } from "node:fs/promises";
import path from "pathe";
import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition } from "../policy.js";

/**
 * Configuration for the WorkspaceInheritance policy.
 *
 * @alpha
 */
export interface WorkspaceInheritanceConfig {
	/**
	 * Package fields that should use workspace inheritance.
	 * @defaultValue ["version", "authors", "license", "repository"]
	 */
	inherit?: string[];

	/**
	 * Crate paths that are allowed to override inherited fields.
	 */
	allowOverrides?: string[];
}

const DEFAULT_INHERIT_FIELDS = ["version", "authors", "license", "repository"];

/**
 * Lazily parse TOML content.
 */
async function parseToml(content: string): Promise<Record<string, unknown>> {
	try {
		const { parse } = await import("smol-toml");
		return parse(content) as Record<string, unknown>;
	} catch {
		throw new Error(
			"smol-toml is required for Cargo workspace policies but is not installed. " +
				"Install it with: pnpm add smol-toml",
		);
	}
}

/**
 * Check if a member path matches any override pattern.
 */
function isOverrideAllowed(member: string, allowOverrides: string[]): boolean {
	return allowOverrides.some((pattern) => {
		if (pattern.endsWith("*")) {
			return member.startsWith(pattern.slice(0, -1));
		}
		return member === pattern;
	});
}

/**
 * Check a single member's fields for workspace inheritance compliance.
 */
async function checkMemberInheritance(
	member: string,
	root: string,
	availableFields: string[],
	errors: string[],
): Promise<void> {
	const memberCargoPath = path.join(root, member, "Cargo.toml");

	try {
		const memberContent = await readFile(memberCargoPath, "utf-8");
		const memberToml = await parseToml(memberContent);
		const memberPkg = memberToml.package as Record<string, unknown> | undefined;

		if (!memberPkg) {
			return;
		}

		for (const field of availableFields) {
			const value = memberPkg[field];
			// Check if the field uses workspace inheritance
			if (
				typeof value === "object" &&
				value !== null &&
				(value as Record<string, unknown>).workspace === true
			) {
				// Using workspace inheritance - good
				continue;
			}
			if (value !== undefined) {
				errors.push(
					`${member}: package.${field} should use workspace inheritance (${field}.workspace = true)`,
				);
			}
		}
	} catch {
		// Member might not exist (handled by WorkspaceMembersValid)
	}
}

/**
 * A policy that ensures Cargo workspace members inherit fields from the workspace config.
 *
 * @alpha
 */
export const WorkspaceInheritance: PolicyDefinition<WorkspaceInheritanceConfig> =
	makePolicyDefinition({
		name: "WorkspaceInheritance",
		description:
			"Ensures Cargo workspace members inherit shared fields (version, authors, etc.) from workspace config.",
		match: /^Cargo\.toml$/,
		handler: async ({ file, root, config }) => {
			const content = await readFile(path.resolve(root, file), "utf-8");
			const toml = await parseToml(content);

			const workspace = toml.workspace as Record<string, unknown> | undefined;
			if (!workspace) {
				return true;
			}

			const members = workspace.members as string[] | undefined;
			if (!members || members.length === 0) {
				return true;
			}

			const inheritFields = config?.inherit ?? DEFAULT_INHERIT_FIELDS;
			const allowOverrides = config?.allowOverrides ?? [];

			// Check which fields are defined at the workspace level
			const workspacePkg = (workspace.package ?? {}) as Record<string, unknown>;
			const availableFields = inheritFields.filter(
				(field) => workspacePkg[field] !== undefined,
			);

			if (availableFields.length === 0) {
				return true;
			}

			const errors: string[] = [];

			for (const member of members) {
				if (member.includes("*")) {
					continue;
				}

				if (isOverrideAllowed(member, allowOverrides)) {
					continue;
				}

				await checkMemberInheritance(member, root, availableFields, errors);
			}

			if (errors.length > 0) {
				return {
					error: errors.join("; "),
					manualFix:
						"Use workspace inheritance in member Cargo.toml files, e.g., `version.workspace = true`.",
				};
			}

			return true;
		},
	});
