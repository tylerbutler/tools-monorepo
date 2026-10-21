import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { run } from "effection";
import { join } from "pathe";
import {
	definePackagePolicy,
	generatePackagePolicy,
	PolicyRunner,
	policy,
} from "repopo/api";
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

	it("type-checks consumer imports and resolver/configuration contracts", async () => {
		const tempRoot = fileURLToPath(new URL("../_temp/", import.meta.url));
		await mkdir(tempRoot, { recursive: true });
		const directory = await mkdtemp(join(tempRoot, "public-api-"));
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
		try {
			await writeFile(join(directory, "consumer.mts"), source);
			await writeFile(
				join(directory, "tsconfig.json"),
				JSON.stringify({
					compilerOptions: {
						noEmit: true,
						strict: true,
						skipLibCheck: true,
						module: "NodeNext",
						target: "ES2022",
						types: [],
					},
					files: ["consumer.mts"],
				}),
			);
			// Keep TypeScript's compiler outside the coverage-instrumented worker.
			await expect(
				promisify(execFile)(
					process.execPath,
					[
						fileURLToPath(import.meta.resolve("typescript/bin/tsc")),
						"--project",
						directory,
					],
					{ timeout: 10000 },
				),
			).resolves.toMatchObject({ stdout: "", stderr: "" });
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	}, 15000);
});
