import { existsSync } from "node:fs";
import path from "pathe";
import type { PolicyShape } from "../policy.js";
import {
	type CargoToml,
	defineCargoPolicy,
} from "../policyDefiners/defineCargoPolicy.js";

/**
 * Configuration for the CargoLockPolicy.
 *
 * @alpha
 */
export interface CargoLockPolicyConfig {
	/**
	 * Policy for binary crates.
	 * - "require": Cargo.lock must be committed (default for binaries)
	 * - "warn": Emit a warning if missing
	 * - "ignore": Skip check
	 *
	 * @defaultValue "require"
	 */
	binaries?: "require" | "warn" | "ignore";

	/**
	 * Policy for library crates.
	 * - "require": Cargo.lock must be committed
	 * - "warn": Emit a warning if committed (default for libraries)
	 * - "ignore": Skip check
	 *
	 * @defaultValue "ignore"
	 */
	libraries?: "require" | "warn" | "ignore";
}

function isBinaryCrate(toml: CargoToml): boolean {
	// Has [[bin]] entries
	if (Array.isArray(toml.bin) && toml.bin.length > 0) {
		return true;
	}
	// Has a default binary (src/main.rs is handled by Cargo implicitly)
	const pkg = toml.package as Record<string, unknown> | undefined;
	if (pkg) {
		// If there's no explicit lib section and no [[bin]], Cargo assumes binary
		// if src/main.rs exists, but we can't check filesystem here.
		// Best heuristic: if there's no [lib] section, it could be a binary.
		return toml.lib === undefined;
	}
	return false;
}

function isLibraryCrate(toml: CargoToml): boolean {
	return toml.lib !== undefined;
}

/**
 * A context-aware policy for Cargo.lock files.
 * Binary crates should commit Cargo.lock; library crates typically shouldn't.
 *
 * @alpha
 */
export const CargoLockPolicy: PolicyShape<CargoLockPolicyConfig> =
	defineCargoPolicy({
		name: "CargoLockPolicy",
		description:
			"Context-aware Cargo.lock validation: binaries should commit it, libraries typically should not.",
		handler: async (toml: CargoToml, { root, file, config }) => {
			// Skip workspace root Cargo.toml
			if (toml.workspace !== undefined && toml.package === undefined) {
				return true;
			}

			const dir = path.dirname(path.resolve(root, file));
			const lockExists = existsSync(path.join(dir, "Cargo.lock"));
			const isBinary = isBinaryCrate(toml);
			const isLib = isLibraryCrate(toml);

			const binaryPolicy = config?.binaries ?? "require";
			const libraryPolicy = config?.libraries ?? "ignore";

			if (isBinary && binaryPolicy === "require" && !lockExists) {
				return {
					error:
						"Binary crate is missing Cargo.lock. Binary crates should commit their lockfile for reproducible builds.",
					manualFix:
						"Run `cargo generate-lockfile` and commit the Cargo.lock file.",
				};
			}

			if (isLib && !isBinary && libraryPolicy === "warn" && lockExists) {
				return {
					error:
						"Library crate has Cargo.lock committed. Library crates typically should not commit their lockfile.",
					manualFix:
						"Consider adding Cargo.lock to .gitignore for library crates.",
				};
			}

			return true;
		},
	});
