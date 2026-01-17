import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition, PolicyFailure } from "../policy.js";

/**
 * A repo policy that checks for JavaScript source files that just use the .js file extension. Such files may be
 * interpreted by node as either CommonJS or ESM based on the `type` field in the nearest package.json file. This
 * can create unexpected behavior for JS files; changing the package.json nearest to one will change how the JS
 * is processed by node. Using explicit file extensions reduces ambiguity and ensures a CJS file isn't suddenly treated
 * like an ESM file.
 *
 * @alpha
 */
export const NoJsFileExtensions: PolicyDefinition = makePolicyDefinition(
	"NoJsFileExtensions",
	/(^|\/)[^/]+\.js$/i,
	async ({ file }) => {
		// Any match is considered a failure.
		const result: PolicyFailure = {
			name: NoJsFileExtensions.name,
			file,
			autoFixable: false,
			errorMessages: [
				"JavaScript files should have a .cjs or .mjs file extension based on the module format of the file.",
			],
			manualFix: "Rename the file to have a .cjs or .mjs file extension.",
		};
		return result;
	},
);
