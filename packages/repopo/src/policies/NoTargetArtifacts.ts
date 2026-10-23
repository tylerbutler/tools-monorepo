import type { Operation } from "effection";
import type { FilePolicyDefinition, PolicyFinding } from "../policy.js";

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
 * @public
 */
export const NoTargetArtifacts = {
	name: "NoTargetArtifacts",
	description:
		"Prevents accidental commits of Rust build artifacts (.rlib, .rmeta, .so, .dylib, etc.).",
	match: ARTIFACT_REGEX,
	handler: function* ({ file }): Operation<PolicyFinding[]> {
		// Allow files inside test/fixture directories
		if (file.includes("test/") || file.includes("fixture")) {
			return [];
		}
		return [
			`Build artifact detected: ${file}. Rust build artifacts should not be committed to source control.`,
		].map((message) => ({
			message,
			manualFix:
				"Remove the file from source control and ensure /target/ is in .gitignore.",
		}));
	},
} satisfies FilePolicyDefinition;
