import { readFile, writeFile } from "node:fs/promises";
import { EOL as newline } from "node:os";
import { extname } from "pathe";
import type {
	PolicyDefinition,
	PolicyFailure,
	PolicyFixResult,
} from "../policy.js";

const trailingSpaces = /\s*\\r\?\\n/;

/**
 * @alpha
 */
export interface FileHeaderPolicyConfig {
	/**
	 * The text to use as the header.
	 */
	headerText: string;

	/**
	 * An optional string that will be appended to the headerText.
	 */
	autoGenText?: string;
}

/**
 * @alpha
 */
export interface FileHeaderGeneratorConfig
	extends Partial<FileHeaderPolicyConfig> {
	match: RegExp;

	/**
	 * Regex matching header prefix (e.g. `/*!\r?\n`)
	 */
	headerStart?: RegExp;

	/**
	 * Regex matching beginning of each line (e.g. ' * ')
	 */
	lineStart: RegExp;

	/**
	 * Regex matching the end of each line (e.g., `\r?\n`)
	 */
	lineEnd: RegExp;

	/**
	 * Regex matching the header postfix.
	 */
	headerEnd?: RegExp;

	replacer: (content: string, config: FileHeaderPolicyConfig) => string;
}

/**
 * Given a `FileHeaderGeneratorConfig`, produces a function that detects correct file headers
 * and returns an error string if the header is missing or incorrect.
 *
 * @alpha
 */
export function generateFileHeaderPolicy(
	name: string,
	config: FileHeaderGeneratorConfig,
): PolicyDefinition<FileHeaderPolicyConfig> {
	const pre = config.headerStart?.source ?? "";
	const start = config.lineStart.source;
	const end = config.lineEnd.source;
	const post = config.headerEnd?.source ?? "";

	// Helper which constructs a matching RegExp from a given multiline string.
	// (See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping)
	const toRegex = (text: string): string =>
		text
			.split(newline)
			.map(
				(line) =>
					`${start}${line.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")}${end}`,
			)
			.join("")
			.replace(trailingSpaces, "\\r?\\n"); // Trim trailing spaces at end-of-line.

	// Detection regex matches the header start (if any), followed by lines in 'headerText',
	// optionally followed by lines in the 'autoGenText', and finally the header end (if any).
	const regex = new RegExp(
		`^${pre}${toRegex(config.headerText ?? "")}(${toRegex(config.autoGenText ?? "")})?${post}`,
	);

	return {
		name,
		match: config.match,
		handler: async ({ file, resolve, config: policyConfig }) => {
			if (policyConfig === undefined) {
				return true;
			}

			const failResult: PolicyFailure = {
				name,
				file,
				autoFixable: true,
			};

			// TODO: Consider reading only the first 512B or so since headers are typically
			// at the beginning of the file.
			const content = await readFile(file, { encoding: "utf8" });
			const failed = !regex.test(content);

			if (failed) {
				failResult.errorMessage = `${extname(file)} file missing header`;
			}

			if (failed) {
				if (resolve) {
					const newContent = config.replacer(content, policyConfig);
					await writeFile(file, newContent);

					const fixResult: PolicyFixResult = {
						...failResult,
						resolved: true,
					};

					return fixResult;
				}
				return failResult;
			}

			return true;
		},
	};
}
