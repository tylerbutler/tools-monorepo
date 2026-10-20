import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { run } from "effection";
import {
	definePackagePolicy,
	generatePackagePolicy,
	PolicyRunner,
	policy,
} from "repopo/api";
import ts from "typescript";
import { describe, expect, it } from "vitest";

interface PackageManifest {
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

describe("package dependency contract", () => {
	it("installs the type-fest dependency referenced by public declarations", async () => {
		const packageJson: PackageManifest = JSON.parse(
			await readFile(new URL("../package.json", import.meta.url), "utf8"),
		);
		expect(packageJson.dependencies?.["type-fest"]).toBeDefined();
	});

	it("declares sort-package-json as an optional peer dependency", async () => {
		const packageJson: PackageManifest = JSON.parse(
			await readFile(new URL("../package.json", import.meta.url), "utf8"),
		);

		expect(packageJson.dependencies?.["sort-package-json"]).toBeUndefined();
		expect(packageJson.peerDependencies?.["sort-package-json"]).toBe("*");
		expect(packageJson.peerDependenciesMeta?.["sort-package-json"]).toEqual({
			optional: true,
		});
	});
});

describe("public API entry points", () => {
	it("runs a generated package policy through repopo/api", async () => {
		const runner = new PolicyRunner({
			policies: [
				policy(
					definePackagePolicy({
						name: "PackageName",
						description: "Checks the package name",
						handler: async (json) =>
							json.name === "repopo"
								? true
								: { error: "Unexpected package name" },
					}),
				),
			],
			gitRoot: fileURLToPath(new URL("..", import.meta.url)),
			resolve: false,
			excludeFromAll: [],
			excludePoliciesForFiles: new Map(),
		});
		expect((await run(() => runner.run(["package.json"]))).results).toEqual([]);
		expect(generatePackagePolicy).toBe(definePackagePolicy);
	});

	it("type-checks consumer imports and resolver/configuration contracts", () => {
		const file = fileURLToPath(
			new URL("../_temp/public-api-consumer.mts", import.meta.url),
		);
		const source = `
					import { definePackagePolicy, generatePackagePolicy, policy, Policy, run as cliRun, type PolicyShape, type PolicyResolver } from "repopo";
					import { definePackagePolicy as apiFactory, PolicyRunner, type RepopoConfig } from "repopo/api";
					// @ts-expect-error The programmatic entry point excludes the CLI runner.
					import { run } from "repopo/api";
					const resolver: PolicyResolver = async () => ({ error: "Fixed", fixed: true });
					const definition: PolicyShape = { name: "Example", description: "Example", match: /./, handler: async () => true as const, resolver };
					class CustomPolicy extends Policy {}
					const config = {
						policies: [
							policy(new CustomPolicy(definition), undefined, { instanceId: "custom" }),
							policy(definition, undefined, { instanceId: "example", exclude: [/^vendor/] }),
							policy(definePackagePolicy({ name: "Package", description: "Package", handler: async json => json.name ? true : { error: "Missing name" } })),
						],
					} satisfies RepopoConfig;
					const alias: typeof definePackagePolicy = generatePackagePolicy;
					const factory: typeof definePackagePolicy = apiFactory;
					new PolicyRunner({ policies: config.policies, gitRoot: "/", resolve: true, excludeFromAll: [], excludePoliciesForFiles: new Map() });
					// @ts-expect-error Options must be supplied as the third argument.
					policy(definition, { exclude: ["vendor/"] });
				`;
		const options: ts.CompilerOptions = {
			noEmit: true,
			strict: true,
			skipLibCheck: true,
			module: ts.ModuleKind.NodeNext,
			target: ts.ScriptTarget.ES2022,
			types: [],
		};
		const host = ts.createCompilerHost(options);
		const getSourceFile = host.getSourceFile.bind(host);
		host.getSourceFile = (name, ...args) =>
			name === file
				? ts.createSourceFile(name, source, ts.ScriptTarget.ES2022, true)
				: getSourceFile(name, ...args);
		const program = ts.createProgram([file], options, host);
		const diagnostics = ts.getPreEmitDiagnostics(program);
		expect(
			diagnostics.map((diagnostic) =>
				ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
			),
		).toEqual([]);
	}, 15000);
});
