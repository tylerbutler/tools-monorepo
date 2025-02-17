import { EOL as newline } from "node:os";
import {
	type FileHeaderPolicyConfig,
	generateFileHeaderPolicy,
} from "../policyGenerators/generateFileHeaderPolicy.js";

/**
 * A RepoPolicy that checks that HTML files have the configured header comment.
 */
export const HtmlFileHeaders = generateFileHeaderPolicy("HtmlFileHeaders", {
	match: /(^|\/)[^/]+\.[mc]?[jt]sx?$/i,
	lineStart: /<!-- /, // Lines begin with '<!-- '
	lineEnd: / -->\r?\n/, // Lines end with ' -->' followed by CRLF or LF
	replacer: (
		content: string,
		{ headerText }: FileHeaderPolicyConfig,
	): string => {
		const newContent = `<!-- ${headerText.replace(
			newline,
			` -->${newline}<!-- `,
		)} -->${newline}${newline}${content}`;
		return newContent;
	},
});
