import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { Args, type Command, Flags } from "@oclif/core";
import { CommandWithConfig, ConfigFileFlag } from "@tylerbu/cli-api";
import { globby } from "globby";
import { TsConfigSorter } from "../api.js";
import type { SortTsconfigConfiguration } from "../config.js";
import { type OrderList, defaultSortOrder } from "../orders.js";

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
		tsconfig: Args.custom<string[]>({
			description:
				"Path to the tsconfig file to sort, or a glob path to select multiple tsconfigs.",
			required: true,
			parse: async (input): Promise<string[]> => {
				const patterns: string[] = [];
				if (existsSync(input)) {
					const stats = statSync(input);
					if (stats.isDirectory()) {
						patterns.push(path.join(input, "tsconfig.json"));
					} else {
						patterns.push(input);
					}
				} else {
					patterns.push(input);
				}

				const results = await globby(patterns, { gitignore: true });
				return results ?? [];
			},
		})(),
		...CommandWithConfig.args,
	};

	static override readonly flags = {
		write: Flags.boolean({
			description:
				"Write the sorted contents back to the file. Without this flag, the command only checks that the file is sorted.",
			default: false,
		}),
		...CommandWithConfig.flags,
		config: ConfigFileFlag,
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

	protected override defaultConfig: SortTsconfigConfiguration | undefined = {
		order: defaultSortOrder,
	};

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: refactor when possible
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

		let orderToUse: OrderList;
		const config = this.commandConfig;
		if (config === undefined) {
			this.warning("No config file found; using default sort order.");
			orderToUse = defaultSortOrder;
		} else if (config.order === undefined) {
			this.warning("No order in config; using default sort order.");
			orderToUse = defaultSortOrder;
		} else {
			orderToUse = config.order;
		}

		const sorter = new TsConfigSorter(orderToUse);

		const unsortedFiles: string[] = [];

		for (const tsconfig of tsconfigs) {
			if (write) {
				const result = sorter.sortTsconfigFile(tsconfig, write);
				this.log(
					result.alreadySorted
						? `File already sorted: ${tsconfig}`
						: `Wrote sorted file: ${tsconfig}`,
				);
			} else {
				const sorted = sorter.isSorted(tsconfig);
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
		this.log("All files sorted.");
	}
}
