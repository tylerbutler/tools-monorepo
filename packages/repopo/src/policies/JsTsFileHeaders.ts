import { EOL as newline } from "node:os";
import {
	type FileHeaderPolicyConfig,
	generateFileHeaderPolicy,
} from "../policyGenerators/generateFileHeaderPolicy.js";

// const htmlReplacer = (
// 	content: string,
// 	{ headerText }: FileHeaderPolicyConfig,
// ): string => {
// 	const newContent = `<!-- ${headerText.replace(
// 		newline,
// 		` -->${newline}<!-- `,
// 	)} -->${newline}${newline}${content}`;
// 	return newContent;
// };

const jsTsReplacer = (
	prevContent: string,
	{ headerText }: FileHeaderPolicyConfig,
): string => {
	// const prevContent = readFile(file);

	// prepend copyright header to existing content
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
 * A RepoPolicy that checks that JavaScript and TypeScript source files havve the configured header comment
 */
export const JsTsFileHeaders = generateFileHeaderPolicy("JsTsFileHeaders", {
	match: /(^|\/)[^/]+\.[mc]?[jt]sx?$/i,
	type: "JavaScript/TypeScript",
	headerStart: /(#![^\n]*\r?\n)?\/\*!\r?\n/, // Begins with optional hashbang followed by '/*!'
	lineStart: / \* /, // Subsequent lines begins with ' * '
	lineEnd: /\r?\n/, // Subsequent lines end with CRLF or LF
	headerEnd: / \*\/\r?\n\r?\n/, // Header ends with ' */' on a line by itself, followed by another newline
	replacer: jsTsReplacer,
});
