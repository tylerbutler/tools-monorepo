/*!
 * Copyright (c) Tyler Butler. All rights reserved.
 * Licensed under the MIT License.
 */

import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "@tylerbu/cli-api";

import { collect } from "../../lib/pr-metrics/collector.js";

export default class CollectCommand extends BaseCommand<typeof CollectCommand> {
	public static override readonly summary =
		"Collect GitHub PR data to JSON Lines files.";

	public static override readonly description =
		`Collects pull request metadata, reviews, and comments from a GitHub repository using the GitHub GraphQL API. Data is written to JSON Lines files that can be queried with DuckDB.

Requires the GitHub CLI (gh) to be installed and authenticated.

Output files:
  prs.jsonl              PR metadata (number, title, author, dates, etc.)
  reviews.jsonl          Code reviews (reviewer, state, timestamp)
  review_comments.jsonl  Inline code comments
  pr_comments.jsonl      Issue-style PR comments`;

	public static override readonly examples = [
		{
			command: "<%= config.bin %> <%= command.id %> microsoft/FluidFramework",
			description: "Collect all PR data from FluidFramework repo",
		},
		{
			command:
				"<%= config.bin %> <%= command.id %> microsoft/FluidFramework -o fluid-prs",
			description: "Collect to a custom output directory",
		},
		{
			command:
				"<%= config.bin %> <%= command.id %> microsoft/FluidFramework --since 2024-01-01",
			description: "Only collect PRs created after a specific date",
		},
	];

	public static override readonly flags = {
		output: Flags.string({
			char: "o",
			description: "Output directory for JSON Lines files.",
			default: "pr-data",
		}),
		since: Flags.string({
			char: "s",
			description:
				"Only collect PRs created after this date (YYYY-MM-DD). PRs are fetched in reverse chronological order, so collection stops when a PR older than this date is encountered.",
		}),
		...BaseCommand.baseFlags,
	};

	public static override readonly args = {
		repo: Args.string({
			required: true,
			description: "GitHub repository in owner/repo format.",
		}),
	};

	public override async run(): Promise<void> {
		const { args, flags } = this;

		// Parse since date if provided
		let since: Date | undefined;
		if (flags.since) {
			since = new Date(flags.since);
			if (Number.isNaN(since.getTime())) {
				this.exit(`Invalid date format: ${flags.since}. Use YYYY-MM-DD.`, 1);
			}
		}

		try {
			const result = await collect(
				{
					repo: args.repo,
					output: flags.output,
					since,
				},
				this.logger,
			);

			this.log("");
			this.success("Collection complete!");
			this.info(`  PRs: ${result.prsCount}`);
			this.info(`  Reviews: ${result.reviewsCount}`);
			this.info(`  Review comments: ${result.reviewCommentsCount}`);
			this.info(`  PR comments: ${result.prCommentsCount}`);
			this.log("");
			this.info(`Data written to: ${result.outputDir}/`);
			this.info("  - prs.jsonl");
			this.info("  - reviews.jsonl");
			this.info("  - review_comments.jsonl");
			this.info("  - pr_comments.jsonl");
			this.log("");
			this.info("Query with DuckDB:");
			this.info(
				`  duckdb -c "SELECT * FROM read_json_auto('${result.outputDir}/prs.jsonl') LIMIT 10"`,
			);
		} catch (error) {
			if (error instanceof Error) {
				this.exit(error.message, 1);
			}
			throw error;
		}
	}
}
