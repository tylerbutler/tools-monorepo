import { describe, expect, it } from "vitest";
import { identifyPolicyInstances, makePolicy } from "../src/makePolicy.js";
import { GleamMonorepoConsistency } from "../src/policies/GleamMonorepoConsistency.js";
import { GleamSharedDependencyVersions } from "../src/policies/GleamSharedDependencyVersions.js";
import { HtmlFileHeaders } from "../src/policies/HtmlFileHeaders.js";
import { JsTsFileHeaders } from "../src/policies/JsTsFileHeaders.js";
import { PackageAllowedScopes } from "../src/policies/PackageAllowedScopes.js";
import { PackageEsmType } from "../src/policies/PackageEsmType.js";
import { PackageJsonProperties } from "../src/policies/PackageJsonProperties.js";
import { PackagePrivateField } from "../src/policies/PackagePrivateField.js";
import { PackageScripts } from "../src/policies/PackageScripts.js";
import { PackageTestScripts } from "../src/policies/PackageTestScripts.js";
import type {
	FilePolicyDefinition,
	RepositoryPolicyDefinition,
} from "../src/policy.js";
import { PolicyRunner } from "../src/runner.js";

const file = {
	name: "File",
	description: "Checks files",
	match: /./,
	handler: async () => [],
} satisfies FilePolicyDefinition;

describe("canonical makePolicy", () => {
	it("retains precise scope, handlers and instance settings without normalized public handlers", () => {
		const exclude = [/^README/m];
		const configured = makePolicy(file, { exclude, instanceId: "one" });
		expect(configured.handler).toBe(file.handler);
		expect(configured.exclude).toBe(exclude);
		expect(configured).not.toHaveProperty("_internalHandler");
		expect(configured).not.toHaveProperty("excludeFiles");
		const repository = {
			name: "Repository",
			description: "Checks inventory",
			scope: "repository",
			handler: async () => [],
		} satisfies RepositoryPolicyDefinition;
		expect(makePolicy(repository).scope).toBe("repository");
	});

	it("selects complete defaults for missing or undefined config, replaces instead of merging, and preserves null", () => {
		const definition = {
			...file,
			requiresConfig: true,
			defaultConfig: { threshold: 10, exclude: ["config-only"] },
			handler: async ({ config }) => (config?.threshold ? [] : []),
		} satisfies FilePolicyDefinition<{
			threshold: number;
			exclude?: string[];
		} | null>;
		expect(makePolicy(definition).config).toBe(definition.defaultConfig);
		expect(makePolicy(definition, { config: undefined }).config).toBe(
			definition.defaultConfig,
		);
		expect(makePolicy(definition, { config: { threshold: 2 } }).config).toEqual(
			{ threshold: 2 },
		);
		const nullable = {
			...definition,
			handler: async ({ config }) => (config === null ? [] : []),
		} satisfies FilePolicyDefinition<{
			threshold: number;
			exclude?: string[];
		} | null>;
		expect(makePolicy(nullable, { config: null }).config).toBeNull();
		expect(makePolicy(definition).exclude).toBeUndefined();
	});

	it.each([
		PackageJsonProperties,
		HtmlFileHeaders,
		JsTsFileHeaders,
		PackageAllowedScopes,
		PackagePrivateField,
		PackageEsmType,
		PackageTestScripts,
		PackageScripts,
		GleamSharedDependencyVersions,
		GleamMonorepoConsistency,
	])("requires explicit config for $name at registration", (definition) => {
		expect(() => Reflect.apply(makePolicy, undefined, [definition])).toThrow(
			"requires config",
		);
		expect(() =>
			Reflect.apply(makePolicy, undefined, [definition, { config: undefined }]),
		).toThrow("requires config");
		expect(
			() => new PolicyRunner({ root: ".", policies: [definition] }),
		).toThrow("requires config");
	});

	it.each([
		"file",
		"repository",
	] as const)("validates %s exclusions when the factory registers the instance", (scope) => {
		const definition =
			scope === "file" ? file : { ...file, scope: "repository" as const };
		expect(() => makePolicy(definition, { exclude: ["["] })).toThrow(
			SyntaxError,
		);
	});

	it.each([
		[undefined, {}],
		[{ threshold: 1 }],
		[{ excludeFiles: ["vendor/"] }],
		[null],
		[[]],
		["config"],
		[{ config: {} }, undefined],
	])("rejects detectable obsolete JavaScript calls: %j", (...args) => {
		expect(() => Reflect.apply(makePolicy, undefined, [file, ...args])).toThrow(
			"Use makePolicy(definition",
		);
	});

	it("allows exclude-shaped config without treating it as instance exclusions", () => {
		const definition = {
			...file,
			handler: async ({ config }) => (config?.exclude ? [] : []),
		} satisfies FilePolicyDefinition<{ exclude: string[] }>;
		const configured = makePolicy(definition, { config: { exclude: ["a"] } });
		expect(configured.config).toEqual({ exclude: ["a"] });
		expect(configured.exclude).toBeUndefined();
	});

	it("rejects repository resolvers at the JavaScript registration boundary", () => {
		expect(() =>
			Reflect.apply(makePolicy, undefined, [
				{
					name: "Repository",
					description: "Inline fixes only",
					scope: "repository",
					handler: async () => [],
					resolver: async () => [],
				},
			]),
		).toThrow("inline fixes only");
	});
});

describe("stable instance identities", () => {
	it("uses a unique name or explicit identity and preserves order independence", () => {
		const one = makePolicy(file, { instanceId: "one" });
		const two = makePolicy(file, { instanceId: "two" });
		expect(
			identifyPolicyInstances([one, two]).map((p) => p.instanceId),
		).toEqual(["one", "two"]);
		expect(
			identifyPolicyInstances([two, one]).map((p) => p.instanceId),
		).toEqual(["two", "one"]);
		expect(identifyPolicyInstances([makePolicy(file)])[0]?.instanceId).toBe(
			"File",
		);
	});
	it("rejects ambiguous definitions and explicit/implicit identity collisions", () => {
		expect(() =>
			identifyPolicyInstances([makePolicy(file), makePolicy(file)]),
		).toThrow("multiple times");
		expect(() =>
			identifyPolicyInstances([
				makePolicy(file, { instanceId: "same" }),
				makePolicy(file, { instanceId: "same" }),
			]),
		).toThrow("Duplicate");
		expect(() =>
			identifyPolicyInstances([
				makePolicy(file),
				makePolicy({ ...file, name: "Other" }, { instanceId: "File" }),
			]),
		).toThrow("conflicts");
	});
});
