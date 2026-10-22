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
// @ts-expect-error Repository policies support inline fixes, not standalone resolvers.
makePolicy({ ...repository, resolver }, { config });
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
const optionalRepository = {
	name: "OptionalRepository", description: "OptionalRepository", scope: "repository",
	handler: async () => [],
} satisfies RepositoryPolicyDefinition;
function mixedUnion(definition: typeof file | typeof optionalRepository) {
	// @ts-expect-error Any required branch prevents omitted options.
	makePolicy(definition);
	// @ts-expect-error Any required branch prevents omitted config.
	makePolicy(definition, {});
	// @ts-expect-error An optional void-config branch cannot permit undefined config.
	makePolicy(definition, { config: undefined });
	// @ts-expect-error A union must not weaken complete explicit config.
	makePolicy(definition, { config: { threshold: 1 } });
	return makePolicy(definition, { config });
}
function mixedFileUnion(definition: typeof file | Omit<typeof file, "requiresConfig">) {
	// @ts-expect-error A same-scope union also needs config for every possible branch.
	makePolicy(definition);
	const configured: ConfiguredFilePolicy<Settings> = makePolicy(definition, { config });
	return configured;
}
function mixedRepositoryUnion(definition: typeof repository | Omit<typeof repository, "requiresConfig">) {
	// @ts-expect-error Repository union omission must also be safe for every branch.
	makePolicy(definition, {});
	const configured: ConfiguredRepositoryPolicy<Settings> = makePolicy(definition, { config });
	return configured;
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
const undefinedDefault = {
	...file, resolver: undefined, defaultConfig: undefined,
	handler: async ({ config }) => [],
} satisfies FilePolicyDefinition<Settings | undefined>;
// @ts-expect-error An undefined default cannot satisfy required config.
makePolicy(undefinedDefault);
// @ts-expect-error Missing config still selects the unusable undefined default.
makePolicy(undefinedDefault, {});
// @ts-expect-error Explicit undefined also selects the unusable default.
makePolicy(undefinedDefault, { config: undefined });
makePolicy(undefinedDefault, { config });
const uncertainDefault = { ...undefinedDefault, defaultConfig: Math.random() > 0.5 ? config : undefined };
// @ts-expect-error A possibly undefined default is not definitely usable.
makePolicy(uncertainDefault);
function mixedDefaultUnion(definition: typeof defaults | typeof undefinedDefault) {
	// @ts-expect-error One usable default cannot cover the other branch's undefined default.
	makePolicy(definition);
	// @ts-expect-error Empty options are unsafe for the branch without a usable default.
	makePolicy(definition, {});
	// @ts-expect-error Undefined selects defaults and one possible branch has none.
	makePolicy(definition, { config: undefined });
	makePolicy(definition, { config });
}
const nullDefault = {
	...nullable, defaultConfig: null,
} satisfies RepositoryPolicyDefinition<Settings | null>;
makePolicy(nullDefault);
makePolicy(nullDefault, {});
makePolicy(nullDefault, { config: undefined });
const undefinedRepositoryDefault = {
	...repository, defaultConfig: undefined, handler: async ({ config }) => [],
} satisfies RepositoryPolicyDefinition<Settings | undefined>;
// @ts-expect-error Repository defaults must also be definitely defined.
makePolicy(undefinedRepositoryDefault);
const nullRequired = { ...nullable, defaultConfig: undefined } satisfies RepositoryPolicyDefinition<Settings | null | undefined>;
makePolicy(nullRequired, { config: null });
const definedDefault = {
	...undefinedDefault, defaultConfig: config,
} satisfies FilePolicyDefinition<Settings | undefined>;
const definedFile: ConfiguredFilePolicy<Settings | undefined> = makePolicy(definedDefault);
function defaultedUnion(definition: typeof definedDefault | typeof nullDefault) {
	makePolicy(definition);
	makePolicy(definition, { config: undefined });
	// @ts-expect-error Union defaults do not permit incomplete explicit config.
	makePolicy(definition, { config: { threshold: 1 } });
}
makePolicy(PackageJsonProperties, { config: { verbatim: { license: "MIT" } } });
makePolicy(HtmlFileHeaders, { config: { headerText: "Copyright" } });
makePolicy(JsTsFileHeaders, { config: { headerText: "Copyright" } });
const headerArguments = { name: "Header", description: "Header", config: { match: /\\.ts$/, lineStart: /\\/\\/ /, lineEnd: /\\r?\\n/, replacer: (content: string) => content } };
const requiredHeader = defineFileHeaderPolicy(headerArguments);
// @ts-expect-error Header helper requires explicit configuration without defaults.
makePolicy(requiredHeader);
const defaultHeader = defineFileHeaderPolicy({ ...headerArguments, defaultConfig: { headerText: "Copyright" } });
makePolicy(defaultHeader);
// @ts-expect-error Header defaults do not permit incomplete explicit config.
makePolicy(defaultHeader, { config: {} });
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
const manifestArguments = { name: "Manifest", description: "Manifest", requiresConfig: true, handler: async () => [] } satisfies { name: string; description: string; requiresConfig: true; handler: () => Promise<PolicyResult> };
const maybeDefault: Settings | undefined = Math.random() > 0.5 ? config : undefined;
const packageUndefined = definePackagePolicy<{}, Settings | undefined>({ ...manifestArguments, defaultConfig: undefined });
const cargoUndefined = defineCargoPolicy<Settings | undefined>({ ...manifestArguments, defaultConfig: undefined });
const gleamUndefined = defineGleamPolicy<Settings | undefined>({ ...manifestArguments, defaultConfig: undefined });
const packageMaybe = definePackagePolicy<{}, Settings | undefined>({ ...manifestArguments, defaultConfig: maybeDefault });
const cargoMaybe = defineCargoPolicy<Settings | undefined>({ ...manifestArguments, defaultConfig: maybeDefault });
const gleamMaybe = defineGleamPolicy<Settings | undefined>({ ...manifestArguments, defaultConfig: maybeDefault });
for (const definition of [packageUndefined, cargoUndefined, gleamUndefined, packageMaybe, cargoMaybe, gleamMaybe]) {
	definition.requiresConfig satisfies true;
	// @ts-expect-error Parsed-manifest helpers retain required metadata for possibly undefined defaults.
	makePolicy(definition);
	// @ts-expect-error Empty options cannot satisfy required config.
	makePolicy(definition, {});
	// @ts-expect-error Undefined cannot satisfy required config.
	makePolicy(definition, { config: undefined });
	// @ts-expect-error Explicit config must remain complete.
	makePolicy(definition, { config: { threshold: 1 } });
	makePolicy(definition, { config });
}
const packageDefault = definePackagePolicy<{}, Settings | undefined>({ ...manifestArguments, defaultConfig: config });
const cargoDefault = defineCargoPolicy<Settings | undefined>({ ...manifestArguments, defaultConfig: config });
const gleamDefault = defineGleamPolicy<Settings | undefined>({ ...manifestArguments, defaultConfig: config });
const packageNull = definePackagePolicy<{}, Settings | null | undefined>({ ...manifestArguments, defaultConfig: null });
const cargoNull = defineCargoPolicy<Settings | null | undefined>({ ...manifestArguments, defaultConfig: null });
const gleamNull = defineGleamPolicy<Settings | null | undefined>({ ...manifestArguments, defaultConfig: null });
for (const definition of [packageDefault, cargoDefault, gleamDefault, packageNull, cargoNull, gleamNull]) {
	const configured: ConfiguredFilePolicy<Settings | null | undefined> = makePolicy(definition);
	makePolicy(definition, {});
	makePolicy(definition, { config: undefined });
	// @ts-expect-error Complete defaults do not allow incomplete explicit replacements.
	makePolicy(definition, { config: { label: "partial" } });
}
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
