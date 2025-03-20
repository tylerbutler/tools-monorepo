import { Flags } from "@oclif/core";
import { BaseCommand } from "@tylerbu/cli-api";
import chalk from "picocolors";
import stripAnsi from "strip-ansi";
import {
	Project,
	type PropertyDeclaration,
	type SourceFile,
	StructureKind,
	SyntaxKind,
} from "ts-morph";

export interface FluidSvelteConfig {
	classes: {
		name: string;
		file: string;
		outputFile: string;
	};
}

export default class GenerateFluidSvelte extends BaseCommand<
	typeof GenerateFluidSvelte
> {
	static override readonly description = "";

	static override readonly flags = {
		tsconfig: Flags.file({
			default: "./tsconfig.json",
			description: "Path to tsconfig.json file to use.",
		}),
		class: Flags.string({
			description: "Name of class to use as base.",
			required: true,
		}),
		input: Flags.file({
			description: "File that contains the input class.",
			exists: true,
			required: true,
		}),
		output: Flags.file({
			description: "Path to output file. Contents will be overwritten.",
			required: true,
		}),
		"dry-run": Flags.boolean({
			description: "Don't make any changes.",
		}),
		...BaseCommand.flags,
	};

	async run(): Promise<void> {
		const { tsconfig, input, class: className, output } = this.flags;
		const project = new Project({
			tsConfigFilePath: tsconfig,
			skipAddingFilesFromTsConfig: true,
		});
		project.addSourceFileAtPath(input);
		project.resolveSourceFileDependencies();
		const sourceInput = project.getSourceFileOrThrow(input);
		const outputSourceFile = project.addSourceFileAtPath(output);
		this.generateOutputFile(sourceInput, outputSourceFile, className);
		await project.save();
	}

	// private readInputFile(
	// 	sourceFile: SourceFile,
	// 	className: string,
	// ): { name: string; properties: PropertyDeclaration[] } {
	// 	const inputClass = sourceFile.getClassOrThrow(className);
	// 	const properties = inputClass.getProperties();
	// 	const name = inputClass.getName()!;
	// 	return { name, properties };
	// }

	private generateOutputFile(
		inputSourceFile: SourceFile,
		outputSourceFile: SourceFile,
		className: string,
	) {
		const inputClass = inputSourceFile.getClassOrThrow(className);
		const properties = inputClass.getInstanceProperties();

		outputSourceFile.addImportDeclaration({
			moduleSpecifier: "./schemaFactory.js",
			namedImports: [{ name: "schemaFactory", alias: "sf" }],
		});

		const newClassName = `Reactive${className}`;

		const newClass = outputSourceFile.addClass({
			name: newClassName,
			isExported: true,
			isAbstract: false,
			extends: (writer) =>
				writer
					.write(`extends sf.object("${newClassName}",`)
					.block(() => {
						const addedProps = new Set<string>();
						for (const prop of properties) {
							if (
								prop.isKind(SyntaxKind.GetAccessor) &&
								!addedProps.has(prop.getName())
							) {
								addedProps.add(prop.getName());
								writer.writeLine(
									`_${prop.getName()}: ${getKind(prop.getType())}`,
								);
							}
						}
					})
					.write(")"),
			implements: [className],
		});

		for (const prop of properties) {
			if (prop.isKind(SyntaxKind.GetAccessor)) {
				// add the private property
				newClass.addProperty({
					// ...prop.getStructure(),
					name: `#${prop.getName()}`,
					initializer: `= $state(this._${prop.getName()};`,
				});
				newClass
					.addGetAccessor({
						name: prop.getName(),
					})
					.addBody()
					.setBodyText((writer) => {
						writer.writeLine(`return this.#${prop.getName()};`);
					});
			}

			if (prop.isKind(SyntaxKind.SetAccessor)) {
				newClass
					.addSetAccessor({
						name: prop.getName(),
						parameters: [{ name: "v" }],
					})
					.addBody()
					.setBodyText((writer) => {
						writer.writeLine(`this._${prop.getName()} = v;`);
					});
			}
		}
	}
}

function getKind(item: any) {
	if (typeof item === "string") {
		return "sf.string";
	}

	if (typeof item === "number") {
		return "sf.number";
	}

	if (typeof item === "boolean") {
		return "sf.boolean";
	}
}
