import { updatePackageJsonFile } from "@fluidframework/build-tools";
import { Args, type Command, Flags } from "@oclif/core";
import { CommandWithoutConfig } from "@tylerbu/cli-api";
import { readJson } from "fs-extra/esm";

export default class EditPackage extends CommandWithoutConfig<
	typeof EditPackage
> {
	static override readonly aliases = ["get:package"];

	static override readonly summary =
		"Inspect or edit package.json properties using a CLI.";

	// static override readonly description =
	// 	"By default, the command will only check if a tsconfig is sorted. Use the --write flag to write the sorted contents back to the file.";

	static override readonly args = {
		property: Args.string({
			description: "The package.json property to inspect or edit.",
			required: true,
		}),
		value: Args.string({
			description: "The value to set the property to.",
			required: false,
		}),
	};

	static override readonly flags = {
		package: Flags.file({
			description: "Path to the package.json file to edit.",
			default: "./package.json",
			exists: true,
		}),
		delete: Flags.boolean({
			description: "Delete the property completely from the package.json.",
			default: false,
		}),
		onlyIfExists: Flags.boolean({
			description:
				"Only update the property if it exists. This is useful when doing bulk operations on many packages, some of which don't have the property.",
			default: false,
			exclusive: ["delete"],
		}),
		...CommandWithoutConfig.flags,
	};

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

	async run(): Promise<void> {
		this.log("Running");
		const { property, value } = this.args;
		const { package: pkg, delete: deleteProperty, onlyIfExists } = this.flags;

		if (value === undefined && !deleteProperty) {
			const json = await readJson(pkg);
			this.log(json[property]);
			return;
		}

		updatePackageJsonFile(pkg, (json) => {
			const propertyExists = Object.hasOwn(json, property);

			if (deleteProperty && propertyExists) {
				// biome-ignore lint/suspicious/noExplicitAny: TODO - worth fixing?
				delete (json as any)[property];
				return;
			}

			if (onlyIfExists && propertyExists) {
				// biome-ignore lint/suspicious/noExplicitAny: TODO - worth fixing?
				(json as any)[property] = value;
				// early return since nothing left to do
				return;
			}
		});
		// }
	}
}
