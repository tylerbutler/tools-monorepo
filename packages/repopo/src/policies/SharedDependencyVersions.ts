import { readFile } from "node:fs/promises";
import path from "pathe";
import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition } from "../policy.js";
import { parseToml } from "../policyDefiners/tomlParser.js";

/**
 * Configuration for the SharedDependencyVersions policy.
 *
 * @alpha
 */
export interface SharedDependencyVersionsConfig {
	/**
	 * Dependencies that should use workspace-level versions.
	 */
	requireWorkspaceDeps?: string[];

	/**
	 * If true, detect version mismatches across workspace members.
	 * @defaultValue true
	 */
	detectMismatches?: boolean;
}

function extractVersion(dep: unknown): string | undefined {
	if (typeof dep === "string") {
		return dep;
	}
	if (typeof dep === "object" && dep !== null) {
		const record = dep as Record<string, unknown>;
		if (typeof record.version === "string") {
			return record.version;
		}
	}
	return undefined;
}

/**
 * Collect dependencies from a TOML object.
 */
function collectDeps(toml: Record<string, unknown>): Map<string, string> {
	const deps = new Map<string, string>();
	const sections = ["dependencies", "dev-dependencies", "build-dependencies"];

	for (const section of sections) {
		const sectionDeps = toml[section] as Record<string, unknown> | undefined;
		if (!sectionDeps) {
			continue;
		}
		for (const [name, value] of Object.entries(sectionDeps)) {
			const version = extractVersion(value);
			if (version && !version.startsWith("workspace")) {
				deps.set(name, version);
			}
		}
	}
	return deps;
}

/**
 * Check that required dependencies are defined at the workspace level.
 */
function checkRequiredWorkspaceDeps(
	config: SharedDependencyVersionsConfig | undefined,
	workspaceDeps: Record<string, unknown>,
	errors: string[],
): void {
	if (!config?.requireWorkspaceDeps) {
		return;
	}
	for (const dep of config.requireWorkspaceDeps) {
		if (!(dep in workspaceDeps)) {
			errors.push(
				`Dependency "${dep}" should be defined in [workspace.dependencies]`,
			);
		}
	}
}

/**
 * Add a member's dependency version to the tracking map.
 */
function recordDependency(
	allDeps: Map<string, Map<string, string[]>>,
	name: string,
	version: string,
	member: string,
): void {
	if (!allDeps.has(name)) {
		allDeps.set(name, new Map());
	}
	const versionMap = allDeps.get(name);
	if (versionMap !== undefined) {
		if (!versionMap.has(version)) {
			versionMap.set(version, []);
		}
		const memberList = versionMap.get(version);
		if (memberList !== undefined) {
			memberList.push(member);
		}
	}
}

/**
 * Collect dependency versions from all workspace members and record which members use them.
 */
async function collectMemberDeps(
	members: string[],
	root: string,
): Promise<Map<string, Map<string, string[]>>> {
	const allDeps = new Map<string, Map<string, string[]>>();

	for (const member of members) {
		if (member.includes("*")) {
			continue;
		}

		const memberCargoPath = path.join(root, member, "Cargo.toml");
		try {
			const memberContent = await readFile(memberCargoPath, "utf-8");
			const memberToml = await parseToml(memberContent);
			const deps = collectDeps(memberToml);

			for (const [name, version] of deps) {
				recordDependency(allDeps, name, version, member);
			}
		} catch {
			// Member might not exist yet (handled by WorkspaceMembersValid)
		}
	}

	return allDeps;
}

/**
 * A policy that detects dependency version mismatches across Cargo workspace members.
 *
 * @alpha
 */
export const SharedDependencyVersions: PolicyDefinition<SharedDependencyVersionsConfig> =
	makePolicyDefinition({
		name: "SharedDependencyVersions",
		description:
			"Detects dependency version mismatches across Cargo workspace members.",
		match: /^Cargo\.toml$/,
		handler: async ({ file, root, config }) => {
			const detectMismatches = config?.detectMismatches ?? true;
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

			const errors: string[] = [];

			// Check required workspace deps
			const workspaceDeps = (workspace.dependencies ?? {}) as Record<
				string,
				unknown
			>;
			checkRequiredWorkspaceDeps(config, workspaceDeps, errors);

			// Detect mismatches across members
			if (detectMismatches) {
				const allDeps = await collectMemberDeps(members, root);

				for (const [dep, versionMap] of allDeps) {
					if (versionMap.size > 1) {
						const details = [...versionMap.entries()]
							.map(
								([ver, memberList]) => `"${ver}" in ${memberList.join(", ")}`,
							)
							.join("; ");
						errors.push(`Version mismatch for "${dep}": ${details}`);
					}
				}
			}

			if (errors.length > 0) {
				return {
					error: errors.join("; "),
					manualFix:
						"Use [workspace.dependencies] with `dep.workspace = true` in member Cargo.toml files to share versions.",
				};
			}

			return true;
		},
	});
