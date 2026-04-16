import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "pathe";
import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition } from "../policy.js";
import { parseToml } from "../policyDefiners/tomlParser.js";

/**
 * Configuration for the WorkspaceMembersValid policy.
 *
 * @alpha
 */
export interface WorkspaceMembersValidConfig {
	/**
	 * If true, validate that all member paths exist on disk.
	 * @defaultValue true
	 */
	validatePaths?: boolean;
}

const GLOB_SUFFIX_REGEX = /\/?\*\*?$/;

/**
 * Expand a simple glob pattern (e.g., "crates/*") into matching directories.
 */
function expandSimpleGlob(root: string, pattern: string): string[] {
	if (!pattern.includes("*")) {
		return [pattern];
	}

	const base = pattern.replace(GLOB_SUFFIX_REGEX, "");
	const baseDir = path.join(root, base);

	if (!existsSync(baseDir)) {
		return [];
	}

	try {
		const entries = readdirSync(baseDir, { withFileTypes: true });
		return entries
			.filter((e) => e.isDirectory())
			.filter((e) => existsSync(path.join(baseDir, e.name, "Cargo.toml")))
			.map((e) => path.join(base, e.name));
	} catch {
		return [];
	}
}

/**
 * Validate a single workspace member entry.
 */
function validateMember(member: string, root: string, errors: string[]): void {
	if (member.includes("*")) {
		// Expand glob and check each result
		const expanded = expandSimpleGlob(root, member);
		if (expanded.length === 0) {
			errors.push(
				`Workspace member glob "${member}" matches no directories with Cargo.toml`,
			);
		}
	} else {
		const memberPath = path.join(root, member);
		if (!existsSync(memberPath)) {
			errors.push(`Workspace member "${member}" does not exist`);
		} else if (!existsSync(path.join(memberPath, "Cargo.toml"))) {
			errors.push(`Workspace member "${member}" exists but has no Cargo.toml`);
		}
	}
}

/**
 * A policy that validates Cargo workspace member paths exist.
 *
 * @alpha
 */
export const WorkspaceMembersValid: PolicyDefinition<WorkspaceMembersValidConfig> =
	makePolicyDefinition({
		name: "WorkspaceMembersValid",
		description:
			"Validates that all Cargo workspace member paths exist and contain Cargo.toml files.",
		match: /^Cargo\.toml$/,
		handler: async ({ file, root, config }) => {
			const validatePaths = config?.validatePaths ?? true;

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

			if (!validatePaths) {
				return true;
			}

			const errors: string[] = [];

			for (const member of members) {
				validateMember(member, root, errors);
			}

			if (errors.length > 0) {
				return {
					error: errors.join("; "),
					manualFix:
						"Fix the workspace.members paths in root Cargo.toml to point to valid crate directories.",
				};
			}

			return true;
		},
	});
