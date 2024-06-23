import type { PolicyFailure, RepoPolicy } from "../policy.js";

/**
 * A repo policy that checks for JavaScript source files that just use the .js file extension. Such files may be
 * interpreted by node as either CommonJS or ESM based on the `type` field in the nearest package.json file. This
 * can create unexpected behavior for JS files; changing the package.json nearest to one will change how the JS
 * is processed by node. Using explicit file extensions reduces ambiguity and ensures a CJS file isn't suddenly treated
 * like an ESM file.
 */
export const NoJsFileExtensions: RepoPolicy = {
	name: "NoJsFileExtensions",
	match: /(^|\/)[^/]+\.js$/i,
	// biome-ignore lint/suspicious/useAwait: <explanation>
	handler: async ({ file }) => {
		// Any match is considered a failure.
		const result: PolicyFailure = {
			name: NoJsFileExtensions.name,
			file,
			autoFixable: false,
			errorMessage:
				"JavaScript files should have a .cjs or .mjs file extension based on the module format of the file. Rename the file accordingly.",
		};
		return result;
	},
};
