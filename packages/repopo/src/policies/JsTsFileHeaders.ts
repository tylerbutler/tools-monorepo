import { EOL as newline } from "node:os";
import {
	defineFileHeaderPolicy,
	type FileHeaderPolicyConfig,
} from "../policyDefiners/defineFileHeaderPolicy.js";

const jsTsReplacer = (
	prevContent: string,
	{ headerText }: FileHeaderPolicyConfig,
): string => {
	// prepend header to existing content
	const separator =
		prevContent.startsWith("\r") || prevContent.startsWith("\n")
			? newline
			: newline + newline;
	const newContent = `/*!${newline} * ${headerText.replace(
		newline,
		`${newline} * `,
	)}${newline} */${separator}${prevContent}`;
	return newContent;
};

/**
 * A RepoPolicy that checks that JavaScript and TypeScript source files have the configured header comment
 *
 * @alpha
 */
export const JsTsFileHeaders = defineFileHeaderPolicy({
	name: "JsTsFileHeaders",
	description:
		"Ensures JavaScript and TypeScript source files have the configured header comment.",
	config: {
		match: /(^|\/)[^/]+\.[mc]?[jt]sx?$/i,
		headerStart: /(#![^\n]*\r?\n)?\/\*!\r?\n/, // Begins with optional hashbang followed by '/*!'
		lineStart: / \* /, // Subsequent lines begins with ' * '
		lineEnd: /\r?\n/, // Subsequent lines end with CRLF or LF
		headerEnd: / \*\/\r?\n\r?\n/, // Header ends with ' */' on a line by itself, followed by another newline
		replacer: jsTsReplacer,
	},
});
