import { readFile, writeFile } from "node:fs/promises";
import { EOL as newline } from "node:os";
import { call } from "effection";
import { extname } from "pathe";
import type { FilePolicyDefinition, PolicyFinding } from "../policy.js";
import { resolveRepoFilePath } from "../utils/safePaths.js";

const trailingSpaces = /\s*\\r\?\\n/;

/**
 * Header text required by a file-header policy.
 *
 * @public
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
 * @public
 */
export interface FileHeaderGeneratorConfig
	extends Partial<FileHeaderPolicyConfig> {
	/** Regular expression that matches files this header generator applies to */
	match: RegExp;

	/**
	 * Regex matching the header prefix, such as a block-comment opener.
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
 * @public
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
	/** Complete default instance configuration, if the policy is usable without an override. */
	defaultConfig?: FileHeaderPolicyConfig;
}

/**
 * Creates a file-header policy that detects missing or incorrect headers and can replace them.
 *
 * Supply {@link FileHeaderPolicyConfig} when configuring the policy, unless
 * the definition supplies a complete default.
 *
 * @param args - Policy metadata and header matching and replacement rules.
 * @returns A file policy configured for the supplied file types.
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
 * @public
 */
export function defineFileHeaderPolicy(
	args: DefineFileHeaderPolicyArgs & { defaultConfig: FileHeaderPolicyConfig },
): FilePolicyDefinition<FileHeaderPolicyConfig> & {
	requiresConfig: true;
	defaultConfig: FileHeaderPolicyConfig;
};
/** Define a header policy that requires explicit header configuration. @public */
export function defineFileHeaderPolicy(
	args: DefineFileHeaderPolicyArgs,
): FilePolicyDefinition<FileHeaderPolicyConfig> & { requiresConfig: true };
export function defineFileHeaderPolicy(
	args: DefineFileHeaderPolicyArgs,
): FilePolicyDefinition<FileHeaderPolicyConfig> & { requiresConfig: true } {
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

	return {
		name,
		description,
		match: config.match,
		requiresConfig: true,
		defaultConfig: args.defaultConfig,
		handler: function* ({ file, root, resolve, config: policyConfig }) {
			if (policyConfig === undefined) {
				throw new TypeError(`${name} requires config.`);
			}

			const regex = new RegExp(
				`^${pre}${toRegex(policyConfig.headerText)}(${toRegex(policyConfig.autoGenText ?? config.autoGenText ?? "")})?${post}`,
			);
			const filePath = resolveRepoFilePath(root, file);
			const failResult: PolicyFinding[] = [];
			// TODO: Consider reading only the first 512B or so since headers are typically
			// at the beginning of the file.
			const content = yield* call(() =>
				readFile(filePath, { encoding: "utf8" }),
			);
			const failed = !regex.test(content);

			if (failed) {
				failResult.push({
					message: `${extname(file)} file missing header`,
					fixStatus: "available",
				});
			}

			if (failed) {
				if (resolve) {
					const newContent = config.replacer(content, policyConfig);
					yield* call(() => writeFile(filePath, newContent));
					const fixResult: PolicyFinding[] = failResult.map((finding) => ({
						...finding,
						fixStatus: "fixed",
					}));
					return fixResult;
				}
				return failResult;
			}
			return [];
		},
	};
}
