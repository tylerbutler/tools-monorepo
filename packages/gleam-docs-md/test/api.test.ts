import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "pathe";
import { describe, expect, it } from "vitest";
import { generateReference } from "../src/api.js";
import type {
	GleamPackageInterface,
	GleamType,
	NamedType,
	VariableType,
} from "../src/types.js";

const namedType = (
	name: string,
	module = "gleam",
	parameters: GleamType[] = [],
): NamedType => ({
	kind: "named",
	name,
	package: module === "gleam" ? "" : "gluegun",
	module,
	parameters,
});
const stringType = (): NamedType => namedType("String");
const intType = (): NamedType => namedType("Int");
const variableType = (id: number): VariableType => ({ kind: "variable", id });

async function runWithFixture(fixture: GleamPackageInterface) {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), "gleam-docs-md-"));
	const docsJsonPath = path.join(tempDir, "package-interface.json");
	const outputDir = path.join(tempDir, "reference");

	await writeFile(docsJsonPath, JSON.stringify(fixture));
	const result = await generateReference({ docsJsonPath, outputDir });

	const read = async (relativePath: string): Promise<string> =>
		readFile(path.join(outputDir, relativePath), "utf8");

	return {
		result,
		read,
		cleanup: () => rm(tempDir, { force: true, recursive: true }),
	};
}

describe("generateReference", () => {
	it("generates reference index and module pages from Gleam docs JSON", async () => {
		const { result, read, cleanup } = await runWithFixture({
			name: "gluegun",
			version: "0.1.0",
			modules: {
				"gluegun/connection": {
					documentation: [
						" Connection management for Erlang Gun.",
						"",
						" Open a Gun process.",
					],
					"type-aliases": {
						Header: {
							documentation: " HTTP header tuple.\n",
							parameters: 0,
							alias: {
								kind: "tuple",
								elements: [stringType(), stringType()],
							},
						},
					},
					types: {
						Protocol: {
							documentation: " Negotiated protocol.\n",
							parameters: 0,
							constructors: [
								{ name: "Http1", parameters: [] },
								{ name: "Http2", parameters: [] },
							],
						},
					},
					constants: {},
					functions: {
						await_up: {
							documentation: " Wait until a Gun connection is up.\n",
							parameters: [
								{
									label: null,
									type: namedType("Connection", "gluegun/internal"),
								},
							],
							return: namedType("Result", "gleam", [
								namedType("Protocol", "gluegun/connection"),
							]),
						},
					},
				},
			},
		});

		try {
			const index = await read("index.md");
			const modulePage = await read("gluegun-connection.md");

			expect(result).toEqual({ pageCount: 2, moduleCount: 1 });
			expect(index).toMatch(/title: Reference/);
			expect(index).toMatch(
				/\[`gluegun\/connection`\]\(\/reference\/gluegun-connection\/\)/,
			);
			expect(modulePage).toMatch(/title: gluegun\/connection/);
			expect(modulePage).toMatch(/## Types/);
			expect(modulePage).toMatch(
				/pub type Protocol \{\n {2}Http1\n {2}Http2\n\}/,
			);
			expect(modulePage).toMatch(/## Type aliases/);
			expect(modulePage).toMatch(/pub type Header = #\(String, String\)/);
			expect(modulePage).toMatch(/## Functions/);
			expect(modulePage).toMatch(
				/pub fn await_up\(internal\.Connection\) -> Result\(Protocol\)/,
			);
		} finally {
			await cleanup();
		}
	});

	it("reports missing Gleam docs JSON with recovery command", async () => {
		const tempDir = await mkdtemp(path.join(os.tmpdir(), "gleam-docs-md-"));

		try {
			await expect(
				generateReference({
					docsJsonPath: path.join(tempDir, "missing-package-interface.json"),
					outputDir: path.join(tempDir, "reference"),
				}),
			).rejects.toThrow(
				/Run `gleam docs build` from the repository root first/,
			);
		} finally {
			await rm(tempDir, { force: true, recursive: true });
		}
	});

	it("renders type variables as a, b, c (gleamoire convention)", async () => {
		const { read, cleanup } = await runWithFixture({
			name: "gluegun",
			version: "0.1.0",
			modules: {
				"gluegun/result": {
					documentation: [],
					"type-aliases": {},
					types: {
						Pair: {
							documentation: "",
							parameters: 2,
							constructors: [
								{
									name: "Pair",
									parameters: [
										{ label: "first", type: variableType(0) },
										{ label: "second", type: variableType(1) },
									],
								},
							],
						},
					},
					constants: {},
					functions: {},
				},
			},
		});

		try {
			const page = await read("gluegun-result.md");
			expect(page).toMatch(
				/pub type Pair\(a, b\) \{\n {2}Pair\(\n {4}first: a,\n {4}second: b\n {2}\)\n\}/,
			);
		} finally {
			await cleanup();
		}
	});

	it("renders multi-parameter functions across multiple lines with labels", async () => {
		const { read, cleanup } = await runWithFixture({
			name: "gluegun",
			version: "0.1.0",
			modules: {
				"gluegun/client": {
					documentation: [],
					"type-aliases": {},
					types: {},
					constants: {},
					functions: {
						send: {
							documentation: "",
							parameters: [
								{ label: "host", type: stringType() },
								{ label: "port", type: intType() },
								{ label: "path", type: stringType() },
							],
							return: namedType("Nil"),
						},
					},
				},
			},
		});

		try {
			const page = await read("gluegun-client.md");
			expect(page).toMatch(
				/pub fn send\(\n {2}host: String,\n {2}port: Int,\n {2}path: String\n\) -> Nil/,
			);
		} finally {
			await cleanup();
		}
	});

	it("renders parameterised type aliases and constants", async () => {
		const { read, cleanup } = await runWithFixture({
			name: "gluegun",
			version: "0.1.0",
			modules: {
				"gluegun/types": {
					documentation: [],
					"type-aliases": {
						ResultPair: {
							documentation: "",
							parameters: 2,
							alias: {
								kind: "tuple",
								elements: [variableType(0), variableType(1)],
							},
						},
					},
					types: {},
					constants: {
						default_timeout: {
							documentation: " Default timeout in ms.\n",
							type: intType(),
						},
					},
					functions: {},
				},
			},
		});

		try {
			const page = await read("gluegun-types.md");
			expect(page).toMatch(/pub type ResultPair\(a, b\) = #\(a, b\)/);
			expect(page).toMatch(/## Constants/);
			expect(page).toMatch(/pub const default_timeout: Int/);
		} finally {
			await cleanup();
		}
	});

	it("renders per-constructor documentation under a Constructors heading", async () => {
		const { read, cleanup } = await runWithFixture({
			name: "gluegun",
			version: "0.1.0",
			modules: {
				"gluegun/connection": {
					documentation: [],
					"type-aliases": {},
					types: {
						Transport: {
							documentation: " Transport selection.\n",
							parameters: 0,
							constructors: [
								{
									name: "Auto",
									documentation:
										" Let Gun choose TLS for TLS ports and TCP otherwise.\n",
									parameters: [],
								},
								{
									name: "Tcp",
									documentation: " Force plain TCP (no TLS).\n",
									parameters: [],
								},
								{
									name: "Tls",
									documentation: " Force TLS.\n",
									parameters: [],
								},
							],
						},
					},
					constants: {},
					functions: {},
				},
			},
		});

		try {
			const page = await read("gluegun-connection.md");
			expect(page).toMatch(
				/#### Constructors\n\n##### `Auto`\n\nLet Gun choose TLS for TLS ports and TCP otherwise\./,
			);
			expect(page).toMatch(/##### `Tcp`\n\nForce plain TCP \(no TLS\)\./);
			expect(page).toMatch(/##### `Tls`\n\nForce TLS\./);
		} finally {
			await cleanup();
		}
	});

	it("omits Constructors block when no constructor has documentation", async () => {
		const { read, cleanup } = await runWithFixture({
			name: "gluegun",
			version: "0.1.0",
			modules: {
				"gluegun/empty": {
					documentation: [],
					"type-aliases": {},
					types: {
						Flag: {
							documentation: "",
							parameters: 0,
							constructors: [
								{ name: "On", documentation: "", parameters: [] },
								{ name: "Off", documentation: "", parameters: [] },
							],
						},
					},
					constants: {},
					functions: {},
				},
			},
		});

		try {
			const page = await read("gluegun-empty.md");
			expect(page.includes("#### Constructors")).toBe(false);
			expect(page).toMatch(/pub type Flag \{\n {2}On\n {2}Off\n\}/);
		} finally {
			await cleanup();
		}
	});

	it("renders deprecation notices as Starlight caution admonitions", async () => {
		const { read, cleanup } = await runWithFixture({
			name: "gluegun",
			version: "0.1.0",
			modules: {
				"gluegun/legacy": {
					documentation: [],
					"type-aliases": {},
					types: {},
					constants: {},
					functions: {
						old_send: {
							documentation: " Old send API.\n",
							deprecation: { message: "Use send/3 instead." },
							parameters: [],
							return: namedType("Nil"),
						},
					},
				},
			},
		});

		try {
			const page = await read("gluegun-legacy.md");
			expect(page).toMatch(
				/:::caution\[Deprecated\]\nUse send\/3 instead\.\n:::/,
			);
		} finally {
			await cleanup();
		}
	});

	it("renders single-parameter constructors and functions inline", async () => {
		const { read, cleanup } = await runWithFixture({
			name: "gluegun",
			version: "0.1.0",
			modules: {
				"gluegun/single": {
					documentation: [],
					"type-aliases": {},
					types: {
						Wrap: {
							documentation: "",
							parameters: 1,
							constructors: [
								{
									name: "Wrap",
									parameters: [{ label: null, type: variableType(0) }],
								},
							],
						},
					},
					constants: {},
					functions: {
						identity: {
							documentation: "",
							parameters: [{ label: null, type: variableType(0) }],
							return: variableType(0),
						},
					},
				},
			},
		});

		try {
			const page = await read("gluegun-single.md");
			expect(page).toMatch(/pub type Wrap\(a\) \{\n {2}Wrap\(a\)\n\}/);
			expect(page).toMatch(/pub fn identity\(a\) -> a/);
		} finally {
			await cleanup();
		}
	});
});
