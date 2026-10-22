import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { join } from "pathe";
import { definePackagePolicy, makePolicy, runPolicies } from "repopo/api";
import { describe, expect, it } from "vitest";

describe("shipped public entry points", () => {
	it("runs a generated package policy through repopo/api", async () => {
		const result = await runPolicies({
			root: fileURLToPath(new URL("..", import.meta.url)),
			files: ["package.json"],
			policies: [
				makePolicy(
					definePackagePolicy({
						name: "PackageName",
						description: "Checks the package name",
						handler: async (json) =>
							json.name === "repopo"
								? []
								: [{ message: "Unexpected package name" }],
					}),
				),
			],
		});
		expect(result.findings).toEqual([]);
		expect(result.errors).toEqual([]);
	});

	it("keeps runtime dependencies used by declarations and optional sorting dependency", async () => {
		const manifest = JSON.parse(
			await readFile(new URL("../package.json", import.meta.url), "utf8"),
		);
		expect(manifest.dependencies["type-fest"]).toBeDefined();
		expect(manifest.dependencies["sort-package-json"]).toBeUndefined();
		expect(manifest.peerDependenciesMeta["sort-package-json"]).toEqual({
			optional: true,
		});
	});

	it("type-checks all three shipped entry points and rejects obsolete contracts", async () => {
		const parent = fileURLToPath(new URL("../_temp/", import.meta.url));
		await mkdir(parent, { recursive: true });
		const directory = await mkdtemp(join(parent, "canonical-public-api-"));
		const consumer = `
import { makePolicy, run as cliRun, type FilePolicyDefinition, type RepositoryPolicyDefinition, type PolicyDefinition, type PolicyResult, type ConfiguredFilePolicy, type ConfiguredRepositoryPolicy, type PolicyOptions } from "repopo";
import { makePolicy as apiFactory, runPolicies, PolicyRunner, definePackagePolicy, defineCargoPolicy, defineGleamPolicy, defineFileHeaderPolicy, type RepopoConfig, type PolicyResolver, type PolicyRunResults, type PolicyRunnerOptions } from "repopo/api";
import { PackageJsonProperties, HtmlFileHeaders, JsTsFileHeaders, RequiredScripts, type PackageJsonPropertiesSettings, type NoLargeBinaryFilesSettings, type LicenseFileExistsSettings, type RequiredGitignorePatternsSettings, type NoPrivateWorkspaceDependenciesSettings } from "repopo/policies";
import type { PackageJsonPropertiesSettings as RootSettings, NoLargeBinaryFilesSettings as RootBinary } from "repopo";
import type { LicenseFileExistsSettings as ApiLicense, RequiredGitignorePatternsSettings as ApiGitignore, NoPrivateWorkspaceDependenciesSettings as ApiPrivate } from "repopo/api";
// @ts-expect-error API entry point deliberately excludes OCLIF run.
import { run } from "repopo/api";
// @ts-expect-error Retired factory.
import { policy } from "repopo";
// @ts-expect-error Retired class and result types.
import { Policy, type PolicyFailure, type PolicyFixResult, type PolicyShape } from "repopo/api";
// @ts-expect-error Retired package helper alias.
import { generatePackagePolicy } from "repopo";
interface Settings { threshold: number; label: string }
const resolver: PolicyResolver<Settings> = async ({ findings, config, file }) => findings.map(finding => ({ ...finding, fixStatus: "fixed" }));
const file = {
	name: "File", description: "File", match: /./, requiresConfig: true,
	handler: async ({ file, config }) => [{ message: file + config?.label }], resolver,
} satisfies FilePolicyDefinition<Settings>;
const repository = {
	name: "Repository", description: "Repository", scope: "repository", requiresConfig: true,
	handler: async ({ files, config }) => files.map(file => ({ message: config?.label ?? "none", files: [file] })),
} satisfies RepositoryPolicyDefinition<Settings>;
const config = { threshold: 1, label: "test" };
const a: ConfiguredFilePolicy<Settings> = makePolicy(file, { config });
const b: ConfiguredRepositoryPolicy<Settings> = apiFactory(repository, { config });
a.match.test("a");
b.scope satisfies "repository";
// @ts-expect-error Factory retains precise repository return type.
b.match;
// @ts-expect-error File handlers cannot receive inventory arguments.
file.handler({ root: "/", files: [], resolve: false, config });
// @ts-expect-error Repository handlers cannot receive a synthetic file argument.
repository.handler({ root: "/", file: "x", resolve: false, config });
function configure(definition: PolicyDefinition<Settings>) { return makePolicy(definition, { config }); }
function requiredUnion(definition: PolicyDefinition<Settings> & { requiresConfig: true }) {
	// @ts-expect-error Common-union overload must enforce required config.
	makePolicy(definition);
	return makePolicy(definition, { config });
}
// @ts-expect-error Required file config is missing.
makePolicy(file);
// @ts-expect-error Required repository config is missing.
makePolicy(repository);
// @ts-expect-error Explicit config must be complete.
makePolicy(file, { config: { threshold: 1 } });
// @ts-expect-error Explicit repository config must be complete.
makePolicy(repository, { config: { label: "x" } });
// @ts-expect-error No positional config.
makePolicy(file, config);
// @ts-expect-error No third argument.
makePolicy(file, { config }, {});
// @ts-expect-error No excludeFiles alias.
makePolicy(file, { config, excludeFiles: [] });
const defaults = { ...file, defaultConfig: config } satisfies FilePolicyDefinition<Settings>;
makePolicy(defaults);
makePolicy(defaults, { config: undefined });
// @ts-expect-error Defaults do not permit partial explicit overrides.
makePolicy(defaults, { config: { threshold: 2 } });
const nullable = { ...repository, handler: async ({ config }) => config === null ? [] : [], defaultConfig: config } satisfies RepositoryPolicyDefinition<Settings | null>;
makePolicy(nullable, { config: null });
const nullableFile = { ...file, resolver: undefined, handler: async ({ config }) => config === null ? [] : [], defaultConfig: config } satisfies FilePolicyDefinition<Settings | null>;
makePolicy(nullableFile, { config: null });
makePolicy(PackageJsonProperties, { config: { verbatim: { license: "MIT" } } });
makePolicy(HtmlFileHeaders, { config: { headerText: "Copyright" } });
makePolicy(JsTsFileHeaders, { config: { headerText: "Copyright" } });
// @ts-expect-error Required built-in metadata survives declarations.
makePolicy(PackageJsonProperties);
// @ts-expect-error Required header metadata survives declarations.
makePolicy(HtmlFileHeaders);
// @ts-expect-error Incomplete header config.
makePolicy(JsTsFileHeaders, { config: {} });
// @ts-expect-error Required scripts config.
makePolicy(RequiredScripts);
const packagePolicy = definePackagePolicy<{}, Settings>({ name: "Package", description: "Package", requiresConfig: true, handler: async () => [] });
// @ts-expect-error Helper retains required metadata.
makePolicy(packagePolicy);
const cargo = defineCargoPolicy<Settings>({ name: "Cargo", description: "Cargo", requiresConfig: true, handler: async () => [] });
// @ts-expect-error Cargo helper retains required metadata.
makePolicy(cargo);
const gleam = defineGleamPolicy<Settings>({ name: "Gleam", description: "Gleam", defaultConfig: config, handler: async () => [] });
makePolicy(gleam);
// @ts-expect-error Helper defaults do not weaken explicit config.
makePolicy(gleam, { config: { threshold: 1 } });
const settings: PolicyOptions<{ exclude: string[] }> = { config: { exclude: ["a"] } };
const repopo = { policies: [a, b] } satisfies RepopoConfig;
const options: PolicyRunnerOptions = { root: "/", inventory: [], files: [], policies: repopo.policies, fix: true, concurrency: 2 };
const promise: Promise<PolicyRunResults> = runPolicies(options);
new PolicyRunner(options).run();
const findings: PolicyResult = [{ message: "one", fixStatus: "available" }, { message: "two", files: ["a", "b"] }];
// @ts-expect-error A pass is an empty array, not true.
const oldPass: PolicyResult = true;
// @ts-expect-error Legacy result fields are not findings.
const oldFailure: PolicyResult = [{ error: "old" }];
async function inspect() {
	const result = await promise;
	for (const finding of result.findings) {
		if (finding.scope === "file") {
			const path: string = finding.file;
			// @ts-expect-error File findings cannot contain repository locations.
			const paths: readonly string[] = finding.files;
		} else {
			const paths: readonly string[] | undefined = finding.files;
			// @ts-expect-error Repository findings have no synthetic file location.
			const path: string = finding.file;
		}
	}
	for (const error of result.errors) { const cause: unknown = error.cause; }
}
`;
		try {
			await writeFile(join(directory, "consumer.mts"), consumer);
			await writeFile(
				join(directory, "tsconfig.json"),
				JSON.stringify({
					compilerOptions: {
						noEmit: true,
						strict: true,
						exactOptionalPropertyTypes: true,
						skipLibCheck: true,
						module: "NodeNext",
						target: "ES2022",
						types: [],
					},
					files: ["consumer.mts"],
				}),
			);
			const { stdout, stderr } = await promisify(execFile)(
				process.execPath,
				[
					fileURLToPath(import.meta.resolve("typescript/bin/tsc")),
					"--project",
					directory,
				],
				{ timeout: 15000 },
			);
			expect(stdout + stderr).toBe("");
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	}, 20000);
});
