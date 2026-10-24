import { Args, type Command, Flags } from "@oclif/core";
import { BaseCommand } from "@tylerbu/cli-api";
import path from "pathe";
import { generateReference } from "../api.js";

export default class GenerateCommand extends BaseCommand<
	typeof GenerateCommand
> {
	public static override readonly summary =
		"Generate Markdown reference docs from a Gleam package-interface.json file.";

	public static override readonly description =
		"Reads a Gleam `package-interface.json` (produced by `gleam docs build`) and writes one Markdown page per module, plus an index page, into the output directory. The output directory is removed and recreated on every run.";

	public static override readonly args = {
		input: Args.string({
			description:
				"Path to a Gleam package-interface.json file (usually under build/dev/docs/<package>/).",
			required: true,
		}),
	};

	public static override readonly flags = {
		out: Flags.directory({
			char: "o",
			description: "Directory to write generated Markdown files into.",
			required: true,
		}),
		"package-name": Flags.string({
			description:
				"Expected package name. If provided, the command fails when the JSON's name field doesn't match.",
		}),
		...BaseCommand.flags,
	} as const;

	public static override readonly examples: Command.Example[] = [
		{
			description: "Generate reference docs for the my_pkg package.",
			command:
				"<%= config.bin %> build/dev/docs/my_pkg/package-interface.json --out website/src/content/docs/reference",
		},
	];

	public override async run(): Promise<void> {
		const { input } = this.args;
		const { out, "package-name": packageName } = this.flags;

		const result = await generateReference({
			docsJsonPath: input,
			outputDir: out,
			...(packageName === undefined
				? {}
				: { expectedPackageName: packageName }),
		});

		this.log(
			`Generated ${result.pageCount} reference pages (${result.moduleCount} modules) in ${path.relative(process.cwd(), out) || "."}`,
		);
	}
}
