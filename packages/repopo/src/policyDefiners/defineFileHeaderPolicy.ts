import { readFile, writeFile } from "node:fs/promises";
import { EOL as newline } from "node:os";
import { call } from "effection";
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
 * Configuration for generating file headers with specific formatting rules.
 *
 * @remarks
 * This interface extends FileHeaderPolicyConfig and adds formatting-specific
 * properties to control how headers are inserted into different file types.
 *
 * @alpha
 */
export interface FileHeaderGeneratorConfig
	extends Partial<FileHeaderPolicyConfig> {
	/** Regular expression that matches files this header generator applies to */
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

	/**
	 * Function that generates the properly formatted header content for insertion into files.
	 *
	 * @param content - The original file content
	 * @param config - The file header policy configuration
	 * @returns The formatted header string to insert
	 */
	replacer: (content: string, config: FileHeaderPolicyConfig) => string;
}

/**
 * Input arguments for defining a file header policy.
 *
 * @alpha
 */
export interface DefineFileHeaderPolicyArgs {
	/**
	 * The name of the policy.
	 */
	name: string;

	/**
	 * A description of the policy's purpose.
	 */
	description: string;

	/**
	 * Configuration for how headers are detected and inserted.
	 */
	config: FileHeaderGeneratorConfig;
}

/**
 * Given a {@link FileHeaderPolicyConfig}, produces a function that detects correct file headers
 * and returns an error string if the header is missing or incorrect.
 *
 * @example
 * ```typescript
 * const MyHeaderPolicy = defineFileHeaderPolicy({
 *   name: "MyHeaderPolicy",
 *   description: "Ensures files have required headers",
 *   config: { match: /\.ts$/, lineStart: /\/\/ /, lineEnd: /\r?\n/, replacer: ... },
 * });
 * ```
 *
 * @alpha
 */
export function defineFileHeaderPolicy(
	args: DefineFileHeaderPolicyArgs,
): PolicyDefinition<FileHeaderPolicyConfig> {
	const { name, description, config } = args;
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
		description,
		match: config.match,
		handler: function* ({ file, resolve, config: policyConfig }) {
			if (policyConfig === undefined) {
				return true;
			}

			const failResult: PolicyFailure = {
				name,
				file,
				autoFixable: true,
				errorMessages: [],
			};

			// TODO: Consider reading only the first 512B or so since headers are typically
			// at the beginning of the file.
			const content = yield* call(() => readFile(file, { encoding: "utf8" }));
			const failed = !regex.test(content);

			if (failed) {
				failResult.errorMessages.push(`${extname(file)} file missing header`);
			}

			if (failed) {
				if (resolve) {
					const newContent = config.replacer(content, policyConfig);
					yield* call(() => writeFile(file, newContent));

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
