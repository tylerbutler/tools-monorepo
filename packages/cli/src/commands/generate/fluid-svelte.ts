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
		const outputSourceFile = project.createSourceFile(output, "", {
			overwrite: true,
		});
		this.generateOutputFile(sourceInput, outputSourceFile, className);
		outputSourceFile.formatText();
		await project.save();
	}

	private addedProps = new Set<string>();

	private generateOutputFile(
		inputSourceFile: SourceFile,
		outputSourceFile: SourceFile,
		className: string,
	) {
		const inputClass = inputSourceFile.getClassOrThrow(className);
		const properties = inputClass.getInstanceProperties();

		for (const d of inputSourceFile.getImportDeclarations()) {
			const importSource = d.getModuleSpecifierValue();
			console.log(d.getModuleSpecifierValue());
			const decl = outputSourceFile.addImportDeclaration({
				moduleSpecifier: importSource,
				isTypeOnly: d.isTypeOnly(),
			});
			for (const n of d.getNamedImports()) {
				decl.addNamedImport({ name: n.getName(), isTypeOnly: n.isTypeOnly() });
			}
		}

		outputSourceFile.addImportDeclarations([
			{
				moduleSpecifier: "fluid-framework",
				namedImports: [
					{
						name: "Tree",
						//  isTypeOnly: true
					},
				],
			},
			{
				moduleSpecifier: "./schemaFactory.js",
				namedImports: [{ name: "schemaFactory", alias: "sf" }],
			},
			{
				moduleSpecifier: `${outputSourceFile.getRelativePathAsModuleSpecifierTo(inputSourceFile)}`,
				namedImports: [{ name: className }],
			},
		]);

		const newClassName = `Reactive${className}`;

		const newClass = outputSourceFile.addClass({
			name: newClassName,
			isExported: true,
			extends: (writer) =>
				writer
					.write(`sf.object("${newClassName}",`)
					.block(() => {
						for (const prop of properties) {
							if (
								prop.isKind(SyntaxKind.GetAccessor) &&
								!this.addedProps.has(prop.getName())
							) {
								this.addedProps.add(prop.getName());
								writer.writeLine(
									`_${prop.getName()}: ${getKind(prop.getReturnType().getText())},`,
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
					initializer: `$state(this._${prop.getName()})`,
				});
				newClass
					.addGetAccessor({
						name: prop.getName(),
					})
					.addBody()
					.setBodyText((writer) => {
						writer.writeLine(
							`return this.#${prop.getName()} as ${prop.getReturnType().getText()};`,
						);
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

		newClass.addProperty({
			name: "#wireReactiveProperties",
			initializer: `(() => {
        Tree.on(this, "nodeChanged", () => {
          this.refreshReactiveProperties();
        });
      })()`,
		});

		const refreshMethod = newClass.addMethod({
			name: "refreshReactiveProperties",
			returnType: "void",
		});
		refreshMethod.setBodyText((writer) => {
			for (const prop of this.addedProps) {
				writer.writeLine(`this.#${prop} = this._${prop};`);
			}
		});
	}
}

function getKind(inputType: string) {
	const itemType = inputType.toLowerCase();
	const check = (kind = "string") =>
		itemType === kind || itemType.includes(kind);

	if (check("string")) {
		return "sf.string";
	}

	if (check("number")) {
		return "sf.number";
	}

	if (check("boolean")) {
		return "sf.boolean";
	}
}
