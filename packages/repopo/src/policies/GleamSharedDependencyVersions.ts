import { readFile } from "node:fs/promises";
import path from "pathe";
import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition } from "../policy.js";
import { parseToml } from "../policyDefiners/tomlParser.js";

/**
 * Configuration for the GleamSharedDependencyVersions policy.
 *
 * @alpha
 */
export interface GleamSharedDependencyVersionsConfig {
	/**
	 * If true, detect version mismatches across packages.
	 * @defaultValue true
	 */
	detectMismatches?: boolean;

	/**
	 * If true, also check dev-dependencies for mismatches.
	 * @defaultValue false
	 */
	includeDev?: boolean;

	/**
	 * Paths to gleam.toml files to compare (relative to repo root).
	 */
	packages?: string[];
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

function collectDeps(
	toml: Record<string, unknown>,
	includeDev: boolean,
): Map<string, string> {
	const deps = new Map<string, string>();
	const sections = ["dependencies"];
	if (includeDev) {
		sections.push("dev-dependencies");
	}

	for (const section of sections) {
		const sectionDeps = toml[section] as Record<string, unknown> | undefined;
		if (!sectionDeps) {
			continue;
		}
		for (const [name, value] of Object.entries(sectionDeps)) {
			const version = extractVersion(value);
			if (version) {
				deps.set(name, version);
			}
		}
	}
	return deps;
}

function recordDependency(
	allDeps: Map<string, Map<string, string[]>>,
	depName: string,
	version: string,
	pkgPath: string,
): void {
	if (!allDeps.has(depName)) {
		allDeps.set(depName, new Map());
	}
	const versionMap = allDeps.get(depName);
	if (versionMap === undefined) {
		return;
	}
	if (!versionMap.has(version)) {
		versionMap.set(version, []);
	}
	versionMap.get(version)?.push(pkgPath);
}

/**
 * A policy that detects dependency version mismatches across Gleam packages in a monorepo.
 *
 * @alpha
 */
export const GleamSharedDependencyVersions: PolicyDefinition<GleamSharedDependencyVersionsConfig> =
	makePolicyDefinition({
		name: "GleamSharedDependencyVersions",
		description:
			"Detects dependency version mismatches across Gleam packages in a monorepo.",
		match: /^gleam\.toml$/,
		handler: async ({ root, config }) => {
			const packagePaths = config?.packages;
			if (!packagePaths || packagePaths.length < 2) {
				return true;
			}

			const detectMismatches = config?.detectMismatches ?? true;
			if (!detectMismatches) {
				return true;
			}

			const includeDev = config?.includeDev ?? false;
			const allDeps = new Map<string, Map<string, string[]>>();

			for (const pkgPath of packagePaths) {
				try {
					const content = await readFile(path.resolve(root, pkgPath), "utf-8");
					const toml = await parseToml(content);
					const deps = collectDeps(toml, includeDev);

					for (const [name, version] of deps) {
						recordDependency(allDeps, name, version, pkgPath);
					}
				} catch {
					// Package might not exist
				}
			}

			const errors: string[] = [];
			for (const [dep, versionMap] of allDeps) {
				if (versionMap.size > 1) {
					const details = [...versionMap.entries()]
						.map(([ver, pkgs]) => `"${ver}" in ${pkgs.join(", ")}`)
						.join("; ");
					errors.push(`Version mismatch for "${dep}": ${details}`);
				}
			}

			if (errors.length > 0) {
				return {
					error: errors.join("; "),
					manualFix:
						"Align dependency versions across all Gleam packages in the monorepo.",
				};
			}

			return true;
		},
	});
