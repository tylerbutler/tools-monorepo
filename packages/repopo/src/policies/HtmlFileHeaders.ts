import { EOL as newline } from "node:os";
import {
	defineFileHeaderPolicy,
	type FileHeaderPolicyConfig,
} from "../policyDefiners/defineFileHeaderPolicy.js";

/**
 * A RepoPolicy that checks that HTML files have the configured header comment.
 *
 * @alpha
 */
export const HtmlFileHeaders = defineFileHeaderPolicy("HtmlFileHeaders", {
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
