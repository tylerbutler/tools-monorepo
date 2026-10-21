import type { Operation } from "effection";
import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition, PolicyFailure } from "../policy.js";

/**
 * Build artifact extensions that should not be committed to source control.
 */
const ARTIFACT_EXTENSIONS = [
	".rlib",
	".rmeta",
	".d",
	".so",
	".dylib",
	".dll",
	".exe",
	".pdb",
];

const ARTIFACT_REGEX = new RegExp(
	`(${ARTIFACT_EXTENSIONS.map((ext) => ext.replace(".", "\\.")).join("|")})$`,
	"i",
);

/**
 * A policy that prevents accidental commits of Rust build artifacts.
 *
 * @alpha
 */
export const NoTargetArtifacts: PolicyDefinition = makePolicyDefinition({
	name: "NoTargetArtifacts",
	description:
		"Prevents accidental commits of Rust build artifacts (.rlib, .rmeta, .so, .dylib, etc.).",
	match: ARTIFACT_REGEX,
	// biome-ignore lint/correctness/useYield: no yield needed
	handler: function* ({ file }): Operation<PolicyFailure> {
		// Allow files inside test/fixture directories
		if (file.includes("test/") || file.includes("fixture")) {
			return true as unknown as PolicyFailure;
		}

		return {
			name: NoTargetArtifacts.name,
			file,
			autoFixable: false,
			errorMessages: [
				`Build artifact detected: ${file}. Rust build artifacts should not be committed to source control.`,
			],
			manualFix:
				"Remove the file from source control and ensure /target/ is in .gitignore.",
		};
	},
});
