import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { Args, type Command, Flags } from "@oclif/core";
import { CommandWithConfig } from "@tylerbu/cli-api";
import { globby } from "globby";
import { isSorted, sortTsconfigFile } from "../api.js";
import type { SortTsconfigConfiguration } from "../config.js";

// type tsconfigArgProps = { startsWith: string; length: number };

// const packageOrReleaseGroupArg = Args.custom({
// 	name: "package_or_release_group",
// 	required: true,
// 	description: "The name of a package or a release group.",
// });

const tsconfigArg = Args.custom<string[]>({
	description:
		"Path to the tsconfig file to sort, or a glob path to select multiple tsconfigs.",
	required: true,
	parse: async (input): Promise<string[]> => {
		const patterns: string[] = [];
		if (existsSync(input)) {
			const stats = statSync(input);
			if (stats.isDirectory()) {
				patterns.push(path.join(input, "tsconfig.json"));
			}
		} else {
			patterns.push(input);
		}

		const results = await globby(patterns, { gitignore: true });
		return results ?? [];
	},
});

export default class SortTsconfigCommand extends CommandWithConfig<
	typeof SortTsconfigCommand,
	SortTsconfigConfiguration
> {
	static override readonly aliases = ["sort:tsconfigs", "sort-tsconfigs"];

	static override readonly summary =
		"Sorts a tsconfig file in place, or check that one is sorted.";

	static override readonly description =
		"By default, the command will only check if a tsconfig is sorted. Use the --write flag to write the sorted contents back to the file.";

	static override readonly args = {
		// tsconfig: Args.string({
		// 	description:
		// 		"Path to the tsconfig file to sort, or a glob path to select multiple tsconfigs.",
		// 	required: true,
		// }),
		tsconfig: tsconfigArg(),
		...CommandWithConfig.args,
	};

	static override readonly flags = {
		write: Flags.boolean({
			description:
				"Write the sorted contents back to the file. Without this flag, the command only checks that the file is sorted.",
			default: false,
		}),
		...CommandWithConfig.flags,
	} as const;

	static override readonly examples: Command.Example[] = [
		{
			description:
				"Check if the tsconfig.json file in the current working directory is sorted.",
			command: "<%= config.bin %> <%= command.id %> .",
		},
		{
			description:
				"Sort the tsconfig.json file in the current working directory.",
			command: "<%= config.bin %> <%= command.id %> . --write",
		},
		{
			description: "Sort all tsconfig.json files under the packages directory.",
			command:
				"<%= config.bin %> <%= command.id %> 'packages/**/tsconfig.json' --write",
		},
	];

	private async parseArg(input: string): Promise<string[]> {
		const patterns: string[] = [];
		if (existsSync(input)) {
			const stats = statSync(input);
			if (stats.isDirectory()) {
				patterns.push(path.join(input, "tsconfig.json"));
			}
		} else {
			patterns.push(input);
		}

		const results = await globby(patterns, { gitignore: true });
		return results ?? [];
	}

	// biome-ignore lint/suspicious/useAwait: inherited method
	async run(): Promise<void> {
		const { tsconfig: tsconfigs } = this.args;
		const { write } = this.flags;

		if (tsconfigs === undefined) {
			this.error("No path or glob to tsconfigs provided.");
		}

		if (tsconfigs.length === 0) {
			this.error("No files found matching arguments");
		}

		const unsortedFiles: string[] = [];

		for (const tsconfig of tsconfigs) {
			if (write) {
				const result = sortTsconfigFile(tsconfig, write);
				this.log(
					result.alreadySorted
						? `File already sorted: ${tsconfig}`
						: `Wrote sorted file: ${tsconfig}`,
				);
			} else {
				const sorted = isSorted(tsconfig);
				if (!sorted) {
					unsortedFiles.push(tsconfig);
					this.errorLog(`Not sorted! ${tsconfig}`);
				}
			}
		}

		if (unsortedFiles.length > 0) {
			this.error(`Found ${unsortedFiles.length} unsorted files.`, {
				exit: 1,
			});
		}
	}
}
