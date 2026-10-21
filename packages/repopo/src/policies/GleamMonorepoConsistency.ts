import { readFile } from "node:fs/promises";
import path from "pathe";
import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition } from "../policy.js";
import { parseToml } from "../policyDefiners/tomlParser.js";

/**
 * Configuration for the GleamMonorepoConsistency policy.
 *
 * @alpha
 */
export interface GleamMonorepoConsistencyConfig {
	/**
	 * Top-level fields that should be consistent across all packages.
	 * @defaultValue ["licences"]
	 */
	syncFields?: string[];

	/**
	 * If true, ensure the `gleam` version constraint is consistent.
	 * @defaultValue true
	 */
	syncGleamVersion?: boolean;

	/**
	 * Paths to gleam.toml files to compare (relative to repo root).
	 * If not specified, the policy only checks the file it matches against.
	 */
	packages?: string[];
}

const DEFAULT_SYNC_FIELDS = ["licences"];

async function loadGleamToml(
	filePath: string,
): Promise<Record<string, unknown> | undefined> {
	try {
		const content = await readFile(filePath, "utf-8");
		return await parseToml(content);
	} catch {
		return undefined;
	}
}

function checkFieldConsistency(
	packages: Map<string, Record<string, unknown>>,
	field: string,
): string[] {
	const values = new Map<string, string[]>();

	for (const [pkg, toml] of packages) {
		const value = JSON.stringify(toml[field] ?? null);
		if (!values.has(value)) {
			values.set(value, []);
		}
		values.get(value)?.push(pkg);
	}

	if (values.size <= 1) {
		return [];
	}

	const details = [...values.entries()]
		.map(([val, pkgs]) => `${val} in ${pkgs.join(", ")}`)
		.join("; ");
	return [`Inconsistent "${field}" across packages: ${details}`];
}

/**
 * A policy that enforces consistent metadata across Gleam packages in a monorepo.
 *
 * @alpha
 */
export const GleamMonorepoConsistency: PolicyDefinition<GleamMonorepoConsistencyConfig> =
	makePolicyDefinition({
		name: "GleamMonorepoConsistency",
		description:
			"Enforces consistent metadata (licences, gleam version, etc.) across Gleam packages in a monorepo.",
		match: /^gleam\.toml$/,
		handler: async ({ root, config }) => {
			const packagePaths = config?.packages;
			if (!packagePaths || packagePaths.length < 2) {
				return true;
			}

			const syncFields = config?.syncFields ?? DEFAULT_SYNC_FIELDS;
			const syncGleamVersion = config?.syncGleamVersion ?? true;

			const packages = new Map<string, Record<string, unknown>>();
			for (const pkgPath of packagePaths) {
				const toml = await loadGleamToml(path.resolve(root, pkgPath));
				if (toml) {
					packages.set(pkgPath, toml);
				}
			}

			if (packages.size < 2) {
				return true;
			}

			const errors: string[] = [];

			for (const field of syncFields) {
				errors.push(...checkFieldConsistency(packages, field));
			}

			if (syncGleamVersion) {
				errors.push(...checkFieldConsistency(packages, "gleam"));
			}

			if (errors.length > 0) {
				return {
					error: errors.join("; "),
					manualFix:
						"Ensure all Gleam packages in the monorepo use consistent metadata values.",
				};
			}

			return true;
		},
	});
