/**
 * Generate Markdown reference documentation from a Gleam
 * `package-interface.json` file.
 *
 * @remarks
 * The Gleam-formatted code blocks (type-variable naming, current-module
 * qualifier elision, multi-line constructors and function params, sum-type
 * blocks, deprecation notices) are ported from gleamoire's `render.gleam`:
 *   https://github.com/GearsDatapacks/gleamoire (Apache-2.0)
 * Many thanks to the gleamoire authors.
 *
 * @packageDocumentation
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "pathe";
import type {
	GleamAlias,
	GleamConstant,
	GleamConstructor,
	GleamDeprecation,
	GleamFunction,
	GleamModuleInterface,
	GleamPackageInterface,
	GleamParameter,
	GleamType,
	GleamTypeDefinition,
	UnknownType,
} from "./types.js";

/**
 * Options for {@link generateReference}.
 *
 * @beta
 */
export interface GenerateReferenceOptions {
	/**
	 * Path to a Gleam `package-interface.json` file. Typically lives under
	 * `build/dev/docs/<package>/package-interface.json` after running
	 * `gleam docs build`.
	 */
	docsJsonPath: string;

	/**
	 * Directory in which the generated Markdown files are written. The
	 * directory is removed and recreated on every run.
	 */
	outputDir: string;

	/**
	 * If provided, override the package name expected in the JSON. Defaults
	 * to "use whatever name is in the file".
	 */
	expectedPackageName?: string;
}

/**
 * The result of a {@link generateReference} call.
 *
 * @beta
 */
export interface GenerateReferenceResult {
	/** Number of Markdown pages written, including the index page. */
	pageCount: number;
	/** Number of module pages written (excludes the index page). */
	moduleCount: number;
}

/**
 * Generate one Markdown page per Gleam module, plus an `index.md`, into
 * `outputDir`.
 *
 * @beta
 */
export async function generateReference(
	options: GenerateReferenceOptions,
): Promise<GenerateReferenceResult> {
	const { docsJsonPath, outputDir, expectedPackageName } = options;

	const packageInterface = await readPackageInterface(
		docsJsonPath,
		expectedPackageName,
	);
	const modules = Object.entries(packageInterface.modules).sort(
		([left], [right]) => left.localeCompare(right),
	);

	await rm(outputDir, { force: true, recursive: true });
	await mkdir(outputDir, { recursive: true });

	await writeFile(
		path.join(outputDir, "index.md"),
		renderIndex(packageInterface, modules),
	);

	for (const [moduleName, moduleInterface] of modules) {
		await writeFile(
			path.join(outputDir, `${moduleSlug(moduleName)}.md`),
			renderModulePage(moduleName, moduleInterface),
		);
	}

	return { pageCount: modules.length + 1, moduleCount: modules.length };
}

async function readPackageInterface(
	docsJsonPath: string,
	expectedPackageName: string | undefined,
): Promise<GleamPackageInterface> {
	let raw: string;
	try {
		raw = await readFile(docsJsonPath, "utf8");
	} catch (error) {
		if (
			error !== null &&
			typeof error === "object" &&
			"code" in error &&
			(error as NodeJS.ErrnoException).code === "ENOENT"
		) {
			throw new Error(
				`Missing ${docsJsonPath}. Run \`gleam docs build\` from the repository root first.`,
			);
		}
		throw error;
	}

	const parsed = JSON.parse(raw) as Partial<GleamPackageInterface> | null;
	if (
		!parsed ||
		typeof parsed.name !== "string" ||
		typeof parsed.modules !== "object" ||
		(expectedPackageName !== undefined && parsed.name !== expectedPackageName)
	) {
		throw new Error(`Invalid Gleam package interface JSON at ${docsJsonPath}`);
	}

	return parsed as GleamPackageInterface;
}

function moduleSlug(moduleName: string): string {
	return moduleName.replaceAll("/", "-");
}

function descriptionFromDocs(
	documentation: string | string[] | undefined,
	fallback: string,
): string {
	const text = normalizeDoc(documentation);
	const firstLine = text.split("\n").find((line) => line.trim().length > 0);
	return firstLine ? firstLine.replaceAll('"', '\\"') : fallback;
}

function normalizeDoc(documentation: string | string[] | undefined): string {
	if (Array.isArray(documentation)) {
		return documentation
			.map((line) => line.trimEnd())
			.join("\n")
			.trim();
	}
	if (typeof documentation === "string") {
		return documentation.trim();
	}
	return "";
}

function code(value: string): string {
	return `\`${value.replaceAll("`", "\\`")}\``;
}

const VARIABLE_ANCHOR_CODE = "a".charCodeAt(0);

// Port of gleamoire's render.gleam type-variable naming: 0 -> "a", 1 -> "b", ...
function variableSymbol(id: number | undefined): string {
	const charCode =
		VARIABLE_ANCHOR_CODE + (Number.isInteger(id) ? (id as number) : 0);
	return String.fromCharCode(charCode);
}

function renderTypeParameters(count: number | undefined): string {
	if (!Number.isInteger(count) || (count as number) <= 0) {
		return "";
	}
	const vars: string[] = [];
	for (let i = 0; i < (count as number); i++) {
		vars.push(variableSymbol(i));
	}
	return `(${vars.join(", ")})`;
}

// Mirrors gleamoire's render_type: omits the qualifier for prelude types
// (module "gleam") and for types declared in the current module, and uses
// only the last segment of the module path otherwise.
function renderType(
	type: GleamType | undefined,
	currentModule: string,
): string {
	if (!type || typeof type !== "object") {
		return "Unknown";
	}

	switch (type.kind) {
		case "named": {
			let qualifier = "";
			if (
				type.module &&
				type.module !== "gleam" &&
				type.module !== currentModule
			) {
				const segments = type.module.split("/");
				qualifier = `${segments.at(-1)}.`;
			}
			const parameters =
				Array.isArray(type.parameters) && type.parameters.length > 0
					? `(${type.parameters
							.map((t) => renderType(t, currentModule))
							.join(", ")})`
					: "";
			return `${qualifier}${type.name}${parameters}`;
		}
		case "fn": {
			const parameters = Array.isArray(type.parameters)
				? type.parameters.map((t) => renderType(t, currentModule)).join(", ")
				: "";
			return `fn(${parameters}) -> ${renderType(type.return, currentModule)}`;
		}
		case "tuple":
			return `#(${(type.elements ?? [])
				.map((t) => renderType(t, currentModule))
				.join(", ")})`;
		case "variable":
			return variableSymbol(type.id ?? 0);
		default: {
			const unknown = type as UnknownType;
			return unknown.name ?? unknown.kind ?? "Unknown";
		}
	}
}

function renderParameter(
	parameter: GleamParameter,
	currentModule: string,
): string {
	const label = parameter.label ? `${parameter.label}: ` : "";
	return `${label}${renderType(parameter.type, currentModule)}`;
}

// Constructors and functions render inline for 0–1 parameters and break onto
// multiple lines for 2+ parameters, matching gleamoire.
function renderConstructor(
	ctor: GleamConstructor,
	currentModule: string,
): string {
	const parameters = ctor.parameters ?? ctor.arguments ?? [];
	if (parameters.length === 0) {
		return ctor.name;
	}
	if (parameters.length === 1) {
		return `${ctor.name}(${renderParameter(parameters[0] as GleamParameter, currentModule)})`;
	}
	const rendered = parameters
		.map((p) => renderParameter(p, currentModule))
		.join(",\n  ");
	return `${ctor.name}(\n  ${rendered}\n)`;
}

function renderFunctionSignature(
	name: string,
	parameters: GleamParameter[] | undefined,
	returnType: GleamType | undefined,
	currentModule: string,
): string {
	let rendered: string;
	if (!Array.isArray(parameters) || parameters.length === 0) {
		rendered = "()";
	} else if (parameters.length === 1) {
		rendered = `(${renderParameter(parameters[0] as GleamParameter, currentModule)})`;
	} else {
		const params = parameters
			.map((p) => renderParameter(p, currentModule))
			.join(",\n  ");
		rendered = `(\n  ${params}\n)`;
	}
	const ret = returnType ? renderType(returnType, currentModule) : "Nil";
	return `pub fn ${name}${rendered} -> ${ret}`;
}

function renderTypeDefinition(
	name: string,
	typeDef: GleamTypeDefinition,
	currentModule: string,
): string {
	const params = renderTypeParameters(typeDef.parameters ?? 0);
	const constructors = normalizeConstructors(typeDef.constructors);
	if (constructors.length === 0) {
		return `pub type ${name}${params}`;
	}
	const body = constructors
		.map(
			(c) =>
				`  ${renderConstructor(c, currentModule).replaceAll("\n", "\n  ")}`,
		)
		.join("\n");
	return `pub type ${name}${params} {\n${body}\n}`;
}

function renderAliasDefinition(
	name: string,
	alias: GleamAlias,
	currentModule: string,
): string {
	const params = renderTypeParameters(alias.parameters ?? 0);
	const aliasType = alias.alias ?? alias.type;
	return `pub type ${name}${params} = ${renderType(aliasType, currentModule)}`;
}

function renderConstantDefinition(
	name: string,
	constant: GleamConstant,
	currentModule: string,
): string {
	return `pub const ${name}: ${renderType(constant.type, currentModule)}`;
}

function deprecationBlock(deprecation: GleamDeprecation | undefined): string {
	if (!deprecation || typeof deprecation !== "object") {
		return "";
	}
	const message = (deprecation.message ?? "").trim();
	const body = message.length > 0 ? message : "This item has been deprecated.";
	return `\n\n:::caution[Deprecated]\n${body}\n:::`;
}

function renderIndex(
	packageInterface: GleamPackageInterface,
	modules: [string, GleamModuleInterface][],
): string {
	const moduleRows = modules
		.map(([moduleName, moduleInterface]) => {
			const description = descriptionFromDocs(
				moduleInterface.documentation,
				`Reference for ${moduleName}.`,
			);
			return `| [${code(moduleName)}](/reference/${moduleSlug(moduleName)}/) | ${description} |`;
		})
		.join("\n");

	return `---
title: Reference
description: Generated ${packageInterface.name} API reference from Gleam docs metadata.
---

# Reference

This reference is generated from Gleam's docs metadata for ${code(packageInterface.name)} ${code(packageInterface.version)}.

For the canonical HexDocs rendering, see [hexdocs.pm/${packageInterface.name}](https://hexdocs.pm/${packageInterface.name}/).

:::note[Generated content]
Pages under \`/reference/\` are generated from Gleam's docs metadata and reflect every public type, function, and constant.
:::

## Modules

| Module | Description |
|---|---|
${moduleRows}
`;
}

function renderModulePage(
	moduleName: string,
	moduleInterface: GleamModuleInterface,
): string {
	const description = descriptionFromDocs(
		moduleInterface.documentation,
		`Reference for ${moduleName}.`,
	);
	const sections = [
		renderTypes(moduleInterface.types, moduleName),
		renderTypeAliases(moduleInterface["type-aliases"], moduleName),
		renderConstants(moduleInterface.constants, moduleName),
		renderFunctions(moduleInterface.functions, moduleName),
	].filter((section): section is string => section.length > 0);

	return `---
title: ${moduleName}
description: ${description}
---

# ${code(moduleName)}

${normalizeDoc(moduleInterface.documentation) || description}

${sections.join("\n\n")}
`;
}

function renderConstructorsSection(
	typeInterface: GleamTypeDefinition,
	moduleName: string,
): string {
	const constructors = normalizeConstructors(typeInterface.constructors).filter(
		(c) => normalizeDoc(c.documentation).length > 0,
	);
	if (constructors.length === 0) {
		return "";
	}

	const items = constructors
		.map((c) => {
			const signature = renderConstructor(c, moduleName);
			const docs = normalizeDoc(c.documentation);
			return `##### ${code(signature)}\n\n${docs}`;
		})
		.join("\n\n");
	return `#### Constructors\n\n${items}`;
}

const LEADING_BLANK_LINES = /^\n\n/;

function renderTypes(
	types: Record<string, GleamTypeDefinition> | undefined,
	moduleName: string,
): string {
	const entries = Object.entries(types ?? {}).sort(([left], [right]) =>
		left.localeCompare(right),
	);
	if (entries.length === 0) {
		return "";
	}

	return [
		"## Types",
		...entries.map(([name, typeInterface]) => {
			const docs = normalizeDoc(typeInterface.documentation);
			const deprecation = deprecationBlock(typeInterface.deprecation);
			const definition = renderTypeDefinition(name, typeInterface, moduleName);
			const constructors = renderConstructorsSection(typeInterface, moduleName);
			const sections = [
				docs
					? `${docs}${deprecation}`
					: deprecation.replace(LEADING_BLANK_LINES, ""),
				`\`\`\`gleam\n${definition}\n\`\`\``,
				constructors,
			].filter((section) => section && section.length > 0);
			return `### ${code(name)}\n\n${sections.join("\n\n")}`;
		}),
	].join("\n\n");
}

function normalizeConstructors(
	constructors:
		| GleamConstructor[]
		| Record<string, Omit<GleamConstructor, "name">>
		| undefined,
): GleamConstructor[] {
	if (Array.isArray(constructors)) {
		return constructors;
	}
	return Object.entries(constructors ?? {})
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([name, ctor]) => ({ name, ...ctor }));
}

function renderTypeAliases(
	typeAliases: Record<string, GleamAlias> | undefined,
	moduleName: string,
): string {
	const entries = Object.entries(typeAliases ?? {}).sort(([left], [right]) =>
		left.localeCompare(right),
	);
	if (entries.length === 0) {
		return "";
	}

	return [
		"## Type aliases",
		...entries.map(([name, alias]) => {
			const docs = normalizeDoc(alias.documentation);
			const deprecation = deprecationBlock(alias.deprecation);
			return `### ${code(name)}

${docs}${deprecation}

\`\`\`gleam
${renderAliasDefinition(name, alias, moduleName)}
\`\`\``;
		}),
	].join("\n\n");
}

function renderConstants(
	constants: Record<string, GleamConstant> | undefined,
	moduleName: string,
): string {
	const entries = Object.entries(constants ?? {}).sort(([left], [right]) =>
		left.localeCompare(right),
	);
	if (entries.length === 0) {
		return "";
	}

	return [
		"## Constants",
		...entries.map(([name, constant]) => {
			const docs = normalizeDoc(constant.documentation);
			const deprecation = deprecationBlock(constant.deprecation);
			return `### ${code(name)}

${docs}${deprecation}

\`\`\`gleam
${renderConstantDefinition(name, constant, moduleName)}
\`\`\``;
		}),
	].join("\n\n");
}

function renderFunctions(
	functions: Record<string, GleamFunction> | undefined,
	moduleName: string,
): string {
	const entries = Object.entries(functions ?? {}).sort(([left], [right]) =>
		left.localeCompare(right),
	);
	if (entries.length === 0) {
		return "";
	}

	return [
		"## Functions",
		...entries.map(([name, functionInterface]) => {
			const docs = normalizeDoc(functionInterface.documentation);
			const deprecation = deprecationBlock(functionInterface.deprecation);
			const signature = renderFunctionSignature(
				name,
				functionInterface.parameters,
				functionInterface.return,
				moduleName,
			);
			return `### ${code(name)}

${docs}${deprecation}

\`\`\`gleam
${signature}
\`\`\``;
		}),
	].join("\n\n");
}
