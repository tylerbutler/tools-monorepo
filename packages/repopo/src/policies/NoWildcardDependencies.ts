import type { PolicyShape } from "../policy.js";
import {
	type CargoToml,
	defineCargoPolicy,
} from "../policyDefiners/defineCargoPolicy.js";

/**
 * Configuration for the NoWildcardDependencies policy.
 *
 * @alpha
 */
export interface NoWildcardDependenciesConfig {
	/**
	 * Version patterns to deny outright.
	 * @defaultValue ["*"]
	 */
	deny?: string[];

	/**
	 * Version patterns to warn about.
	 * @defaultValue [">="]
	 */
	warn?: string[];

	/**
	 * If true, dev-dependencies are checked more leniently (only deny, not warn).
	 * @defaultValue true
	 */
	allowDev?: boolean;
}

const DEFAULT_DENY = ["*"];
const DEFAULT_WARN = [">="];

function checkVersionSpec(
	version: string,
	denyPatterns: string[],
	warnPatterns: string[],
): "deny" | "warn" | "ok" {
	for (const pattern of denyPatterns) {
		if (version === pattern || version.startsWith(pattern)) {
			return "deny";
		}
	}
	for (const pattern of warnPatterns) {
		if (version.startsWith(pattern)) {
			return "warn";
		}
	}
	return "ok";
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

function checkSectionDeps(
	deps: Record<string, unknown>,
	sectionName: string,
	isDev: boolean,
	allowDev: boolean,
	denyPatterns: string[],
	warnPatterns: string[],
	errors: string[],
): void {
	for (const [depName, depValue] of Object.entries(deps)) {
		const version = extractVersion(depValue);
		if (!version) {
			continue;
		}

		const effectiveWarn = isDev && allowDev ? [] : warnPatterns;
		const result = checkVersionSpec(version, denyPatterns, effectiveWarn);

		if (result === "deny") {
			errors.push(
				`[${sectionName}] ${depName} = "${version}" uses a denied version pattern`,
			);
		} else if (result === "warn") {
			errors.push(
				`[${sectionName}] ${depName} = "${version}" uses an overly permissive version range`,
			);
		}
	}
}

/**
 * A policy that prevents wildcard or overly permissive version specifications in Cargo.toml.
 *
 * @alpha
 */
export const NoWildcardDependencies: PolicyShape<NoWildcardDependenciesConfig> =
	defineCargoPolicy({
		name: "NoWildcardDependencies",
		description:
			"Prevents wildcard or overly permissive dependency version specifications in Cargo.toml.",
		handler: async (toml: CargoToml, { config }) => {
			// Skip workspace root
			if (toml.workspace !== undefined && toml.package === undefined) {
				return true;
			}

			const denyPatterns = config?.deny ?? DEFAULT_DENY;
			const warnPatterns = config?.warn ?? DEFAULT_WARN;
			const allowDev = config?.allowDev ?? true;
			const errors: string[] = [];

			const sections = [
				{ name: "dependencies", isDev: false },
				{ name: "build-dependencies", isDev: false },
				{ name: "dev-dependencies", isDev: true },
			];

			for (const { name, isDev } of sections) {
				const deps = toml[name] as Record<string, unknown> | undefined;
				if (!deps) {
					continue;
				}

				checkSectionDeps(
					deps,
					name,
					isDev,
					allowDev,
					denyPatterns,
					warnPatterns,
					errors,
				);
			}

			if (errors.length > 0) {
				return {
					error: errors.join("; "),
					manualFix:
						'Use specific version ranges (e.g., "1.0", "^1.0", "~1.0") instead of wildcards.',
				};
			}

			return true;
		},
	});
