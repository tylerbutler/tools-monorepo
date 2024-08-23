import { Flags } from "@oclif/core";
import { GitCommand, RegExpFlag } from "@tylerbu/cli-api";

type PolicyAction = "handle" | "resolve";

// type ExcludedPolicyFileMap = Map<PolicyName, RegExp[]>; // Record<PolicyName, RegExp[]>

/**
 * A convenience interface used to pass commonly used parameters to functions in this file.
 */
interface CheckPolicyCommandContext {
	/**
	 * A regular expression used to filter selected files.
	 */
	pathRegex: RegExp;

	/**
	 * A list of regular expressions used to exclude files from all handlers.
	 */
	excludeFiles: RegExp[];

	/**
	 * A list of handlers to apply to selected files.
	 */
	// policies: RepoPolicy[];

	/**
	 * A per-handler list of regular expressions used to exclude files from specific handlers.
	 */
	// excludePoliciesForFiles: ExcludedPolicyFileMap;

	/**
	 * Path to the root of the git repo.
	 */
	gitRoot: string;

	/**
	 * The repo context.
	 */
	// context: Context;
}

/**
 * Stores performance data for each handler. Used to collect and display performance stats.
 */
const handlerPerformanceData = new Map<PolicyAction, Map<string, number>>();

/**
 * This tool enforces policies across the code base via a series of handler functions. The handler functions are
 * associated with a regular expression, and all files matching that expression are passed to the handler function.
 *
 * By default, the list of files to check comes from `git ls-files. You can also pipe in file names from stdin. For
 * example:
 *
 * `git ls-files -co --exclude-standard --full-name | repopo check --stdin --verbose`
 */

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class CheckPolicy extends GitCommand<
	typeof CheckPolicy & {
		args: typeof GitCommand.args;
		flags: typeof GitCommand.flags;
	},
	CheckPolicyCommandContext
> {
	static override readonly summary =
		"Checks and applies policies to the files in the repository.";

	static override readonly flags = {
		fix: Flags.boolean({
			aliases: ["resolve"],
			description: "Fix errors if possible.",
			required: false,
			char: "f",
		}),
		policy: RegExpFlag({
			description:
				"Filter policies to apply by <regex>. Only policies with a name matching the regex will be applied.",
			required: false,
			char: "d",
		}),
		excludePolicy: Flags.string({
			char: "D",
			description:
				"Exclude policies by name. Can be specified multiple times to exclude multiple policies.",
			exclusive: ["policy"],
			multiple: true,
		}),
		path: RegExpFlag({
			description: "Filter file paths by <regex>.",
			required: false,
			char: "p",
		}),
		stdin: Flags.boolean({
			description: "Read list of files from stdin.",
			required: false,
		}),
		...GitCommand.flags,
	} as const;
}

function toRegExp(input: string | RegExp): RegExp {
	if (typeof input === "string") {
		return new RegExp(input, "i");
	}
	return input;
}
