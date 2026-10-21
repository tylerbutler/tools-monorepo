import { existsSync } from "node:fs";
import path from "pathe";
import type { PolicyShape } from "../policy.js";
import {
	defineGleamPolicy,
	type GleamToml,
} from "../policyDefiners/defineGleamPolicy.js";

function validatePathDep(
	depName: string,
	depValue: unknown,
	sectionName: string,
	baseDir: string,
): string | undefined {
	if (typeof depValue !== "object" || depValue === null) {
		return undefined;
	}
	const record = depValue as Record<string, unknown>;
	if (typeof record.path !== "string") {
		return undefined;
	}

	const depDir = path.resolve(baseDir, record.path);

	if (!existsSync(depDir)) {
		return `[${sectionName}] "${depName}" path "${record.path}" does not exist`;
	}
	if (!existsSync(path.join(depDir, "gleam.toml"))) {
		return `[${sectionName}] "${depName}" path "${record.path}" exists but has no gleam.toml`;
	}
	return undefined;
}

function checkSection(
	sectionName: string,
	data: unknown,
	baseDir: string,
): string[] {
	if (!data || typeof data !== "object") {
		return [];
	}
	const deps = data as Record<string, unknown>;
	const errors: string[] = [];
	for (const [depName, depValue] of Object.entries(deps)) {
		const error = validatePathDep(depName, depValue, sectionName, baseDir);
		if (error) {
			errors.push(error);
		}
	}
	return errors;
}

/**
 * A policy that validates all path dependency targets in gleam.toml exist
 * and contain a gleam.toml file.
 *
 * @alpha
 */
export const GleamPathDepsValid: PolicyShape = defineGleamPolicy({
	name: "GleamPathDepsValid",
	description:
		"Validates that all path dependency targets exist and contain a gleam.toml file.",
	handler: async (toml: GleamToml, { file, root }) => {
		const baseDir = path.resolve(root, path.dirname(file));
		const errors: string[] = [
			...checkSection("dependencies", toml.dependencies, baseDir),
			...checkSection("dev-dependencies", toml["dev-dependencies"], baseDir),
		];

		if (errors.length > 0) {
			return {
				error: errors.join("; "),
				manualFix:
					"Fix the path dependencies to point to valid Gleam project directories.",
			};
		}

		return true;
	},
});
