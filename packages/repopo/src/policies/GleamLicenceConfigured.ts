import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "pathe";
import type { PolicyShape } from "../policy.js";
import {
	defineGleamPolicy,
	type GleamToml,
} from "../policyDefiners/defineGleamPolicy.js";

/**
 * Configuration for the GleamLicenceConfigured policy.
 *
 * @alpha
 */
export interface GleamLicenceConfiguredConfig {
	/**
	 * Allowed SPDX licence identifiers. If set, only these are accepted.
	 */
	allowedLicences?: string[];

	/**
	 * If true, validate licence values against the SPDX licence list
	 * using `spdx-correct`. When enabled, typos like "MIIT" are detected
	 * and can be auto-fixed to the correct identifier ("MIT").
	 *
	 * Requires the optional peer dependency `spdx-correct` to be installed.
	 *
	 * @defaultValue false
	 */
	validateSpdx?: boolean;
}

/**
 * Lazily load spdx-correct. It's an optional peer dependency.
 */
async function tryCorrectLicence(
	licence: string,
): Promise<string | null | undefined> {
	try {
		const mod = (await import("spdx-correct")) as {
			default?: (id: string) => string | null;
		};
		const correct =
			mod.default ?? (mod as unknown as (id: string) => string | null);
		return correct(licence);
	} catch {
		return undefined;
	}
}

interface LicenceValidationResult {
	errors: string[];
	corrections: Map<string, string>;
}

async function validateWithSpdxCorrect(
	licences: string[],
): Promise<LicenceValidationResult> {
	const errors: string[] = [];
	const corrections = new Map<string, string>();

	for (const licence of licences) {
		const corrected = await tryCorrectLicence(licence);
		if (corrected === undefined) {
			errors.push(
				`Cannot validate "${licence}": spdx-correct is not installed. Install it with: pnpm add spdx-correct`,
			);
			break;
		}
		if (corrected === null) {
			errors.push(`Licence "${licence}" is not a recognized SPDX identifier`);
		} else if (corrected !== licence) {
			corrections.set(licence, corrected);
			errors.push(`Licence "${licence}" should be "${corrected}"`);
		}
	}

	return { errors, corrections };
}

function validateAllowlist(
	licences: string[],
	allowedLicences: string[],
): string[] {
	const errors: string[] = [];
	for (const licence of licences) {
		if (!allowedLicences.includes(licence)) {
			errors.push(
				`Licence "${licence}" is not in the allowed list: ${allowedLicences.join(", ")}`,
			);
		}
	}
	return errors;
}

function applyCorrections(
	content: string,
	corrections: Map<string, string>,
): string {
	let result = content;
	for (const [original, corrected] of corrections) {
		result = result.replace(`"${original}"`, `"${corrected}"`);
	}
	return result;
}

async function tryAutoFix(
	filePath: string,
	corrections: Map<string, string>,
	errors: string[],
): Promise<{ error: string; fixable: boolean; fixed: boolean }> {
	try {
		const content = await readFile(filePath, "utf-8");
		const fixed = applyCorrections(content, corrections);
		await writeFile(filePath, fixed);
		return { error: errors.join("; "), fixable: true, fixed: true };
	} catch {
		return {
			error: `${errors.join("; ")}. Auto-fix failed.`,
			fixable: true,
			fixed: false,
		};
	}
}

/**
 * A policy that ensures licence metadata is properly configured in gleam.toml.
 *
 * @alpha
 */
export const GleamLicenceConfigured: PolicyShape<GleamLicenceConfiguredConfig> =
	defineGleamPolicy({
		name: "GleamLicenceConfigured",
		description:
			"Ensures gleam.toml has valid SPDX licence identifiers configured.",
		handler: async (
			toml: GleamToml,
			{ file, root, resolve: shouldResolve, config },
		) => {
			const licences = toml.licences;

			if (!Array.isArray(licences) || licences.length === 0) {
				return {
					error: "Missing or empty licences field in gleam.toml.",
					manualFix:
						'Add licences = ["MIT"] (or appropriate SPDX identifier) to gleam.toml.',
				};
			}

			// Check allowlist first (takes priority)
			if (config?.allowedLicences) {
				const errors = validateAllowlist(
					licences as string[],
					config.allowedLicences,
				);
				if (errors.length > 0) {
					return {
						error: errors.join("; "),
						manualFix:
							"Use valid SPDX licence identifiers (e.g., MIT, Apache-2.0, MPL-2.0).",
					};
				}
			}

			// Validate with spdx-correct if enabled
			if (config?.validateSpdx) {
				const { errors, corrections } = await validateWithSpdxCorrect(
					licences as string[],
				);
				if (errors.length > 0) {
					if (shouldResolve && corrections.size > 0) {
						return tryAutoFix(resolve(root, file), corrections, errors);
					}
					return {
						error: errors.join("; "),
						fixable: corrections.size > 0,
						manualFix:
							"Use valid SPDX licence identifiers (e.g., MIT, Apache-2.0, MPL-2.0).",
					};
				}
			}

			return true;
		},
	});
