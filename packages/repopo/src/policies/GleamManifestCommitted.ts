import { existsSync } from "node:fs";
import path from "pathe";
import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition } from "../policy.js";

/**
 * A policy that ensures manifest.toml is committed alongside gleam.toml
 * for reproducible Gleam builds.
 *
 * @alpha
 */
export const GleamManifestCommitted: PolicyDefinition = makePolicyDefinition({
	name: "GleamManifestCommitted",
	description:
		"Ensures manifest.toml is committed alongside gleam.toml for reproducible builds.",
	match: /gleam\.toml$/,
	handler: async ({ file, root }) => {
		const dir = path.dirname(path.resolve(root, file));
		const manifestPath = path.join(dir, "manifest.toml");

		if (existsSync(manifestPath)) {
			return true;
		}

		return {
			error:
				"Missing manifest.toml. Gleam projects should commit manifest.toml for reproducible builds.",
			manualFix:
				"Run `gleam build` to generate manifest.toml, then commit it to source control.",
		};
	},
});
