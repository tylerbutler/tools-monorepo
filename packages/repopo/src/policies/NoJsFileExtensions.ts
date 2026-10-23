import type { Operation } from "effection";
import type { FilePolicyDefinition, PolicyFinding } from "../policy.js";
/**
 * A repo policy that checks for JavaScript source files that just use the .js file extension. Such files may be
 * interpreted by node as either CommonJS or ESM based on the `type` field in the nearest package.json file. This
 * can create unexpected behavior for JS files; changing the package.json nearest to one will change how the JS
 * is processed by node. Using explicit file extensions reduces ambiguity and ensures a CJS file isn't suddenly treated
 * like an ESM file.
 *
 * @public
 */
export const NoJsFileExtensions = {
	name: "NoJsFileExtensions",
	description:
		"Prevents ambiguous .js files by requiring explicit .mjs or .cjs extensions based on module format.",
	match: /(^|\/)[^/]+\.js$/i,
	handler: function* (): Operation<PolicyFinding[]> {
		return [
			"JavaScript files should have a .cjs or .mjs file extension based on the module format of the file.",
		].map((message) => ({
			message,
			manualFix: "Rename the file to have a .cjs or .mjs file extension.",
		}));
	},
} satisfies FilePolicyDefinition;
