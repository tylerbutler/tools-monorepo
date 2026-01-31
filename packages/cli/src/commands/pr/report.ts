/*!
 * Copyright (c) Tyler Butler. All rights reserved.
 * Licensed under the MIT License.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { Flags } from "@oclif/core";
import { BaseCommand } from "@tylerbu/cli-api";

import { generateReportQuery } from "../../lib/pr-metrics/sql.js";

export default class ReportCommand extends BaseCommand<typeof ReportCommand> {
	public static override readonly summary =
		"Generate contributor metrics report from collected PR data.";

	public static override readonly description =
		`Generates a contributor metrics report from PR data collected with 'pr collect'. Uses DuckDB to query the JSON Lines files and produce a summary of PR activity.

Requires DuckDB to be installed (brew install duckdb).

Report includes:
  - PRs opened per contributor
  - PRs merged per contributor
  - PRs reviewed per contributor
  - Reviews given per contributor
  - Review comments given per contributor
  - Average PR duration (time from open to merge)
  - Average time to first review`;

	public static override readonly examples = [
		{
			command:
				"<%= config.bin %> <%= command.id %> --start 2024-01-01 --end 2024-01-31",
			description: "Generate report for January 2024",
		},
		{
			command:
				"<%= config.bin %> <%= command.id %> -s 2024-01-01 -e 2024-01-14 --csv > report.csv",
			description: "Export report as CSV",
		},
		{
			command:
				"<%= config.bin %> <%= command.id %> -s 2024-01-01 -e 2024-01-14 --data /path/to/data",
			description: "Use a custom data directory",
		},
	];

	public static override readonly flags = {
		start: Flags.string({
			char: "s",
			required: true,
			description: "Start date (YYYY-MM-DD).",
		}),
		end: Flags.string({
			char: "e",
			required: true,
			description: "End date (YYYY-MM-DD).",
		}),
		data: Flags.string({
			char: "d",
			default: "pr-data",
			description: "Data directory containing JSON Lines files.",
		}),
		csv: Flags.boolean({
			default: false,
			description: "Output as CSV format.",
		}),
		...BaseCommand.baseFlags,
	};

	public override async run(): Promise<void> {
		const { flags } = this;

		// Validate data directory exists
		if (!existsSync(flags.data)) {
			this.exit(
				`Data directory not found: ${flags.data}\nRun 'tbu pr collect <repo>' first to collect data.`,
				1,
			);
		}

		// Check if duckdb is installed
		try {
			execFileSync("which", ["duckdb"], { encoding: "utf-8" });
		} catch {
			this.exit(
				"DuckDB is not installed.\nInstall with: brew install duckdb",
				1,
			);
		}

		// Generate and run the query
		const query = generateReportQuery(flags.data, flags.start, flags.end);

		try {
			const duckdbArgs = flags.csv ? ["-csv", "-c", query] : ["-c", query];

			const result = execFileSync("duckdb", duckdbArgs, {
				encoding: "utf-8",
				maxBuffer: 50 * 1024 * 1024, // 50MB buffer
			});

			// Output the result directly (duckdb formats it)
			this.log(result);
		} catch (error) {
			if (error instanceof Error) {
				this.exit(`DuckDB query failed: ${error.message}`, 1);
			}
			throw error;
		}
	}
}
