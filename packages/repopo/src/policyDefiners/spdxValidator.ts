import { readFile, writeFile } from "node:fs/promises";
import type { PolicyResult } from "../policy.js";

/**
 * Lazily load spdx-correct. It's an optional peer dependency.
 *
 * @returns The corrected identifier, `null` if unrecognized, or `undefined` if
 * spdx-correct is not installed.
 *
 * @internal
 */
export async function tryCorrectLicence(
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

/**
 * Result of validating licence identifiers with spdx-correct.
 *
 * @internal
 */
export interface LicenceValidationResult {
	/** Human-readable error messages. */
	errors: string[];
	/** Map from original identifier to its corrected form. */
	corrections: Map<string, string>;
}

/**
 * Validate an array of licence identifiers using spdx-correct.
 *
 * @internal
 */
export async function validateWithSpdxCorrect(
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

/**
 * Check that all licence identifiers are in the allowed list.
 *
 * @internal
 */
export function validateAllowlist(
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

/**
 * Replace quoted licence strings in TOML/text content with their corrected forms.
 *
 * @internal
 */
export function applyCorrections(
	content: string,
	corrections: Map<string, string>,
): string {
	let result = content;
	for (const [original, corrected] of corrections) {
		result = result.replace(`"${original}"`, `"${corrected}"`);
	}
	return result;
}

/**
 * Read a file, apply licence corrections, and write it back.
 *
 * @internal
 */
export async function tryAutoFix(
	filePath: string,
	corrections: Map<string, string>,
	errors: string[],
): Promise<PolicyResult> {
	try {
		const content = await readFile(filePath, "utf-8");
		const fixed = applyCorrections(content, corrections);
		await writeFile(filePath, fixed);
		const correctedMessages = new Set(
			[...corrections].map(
				([original, corrected]) =>
					`Licence "${original}" should be "${corrected}"`,
			),
		);
		return errors.map((message) => ({
			message,
			fixStatus: correctedMessages.has(message) ? "fixed" : undefined,
		}));
	} catch {
		return errors.map((message) => ({
			message: `${message}. Auto-fix failed.`,
			fixStatus: "failed",
		}));
	}
}

/**
 * Validate licence identifiers and optionally auto-fix them.
 *
 * Combines spdx-correct validation with allowlist checking and auto-fix
 * into a single helper used by both Cargo and Gleam licence policies.
 *
 * @returns An empty array if valid, or findings that describe invalid expressions.
 * Returns `undefined` if no validation was requested (both allowlist and
 * validateSpdx are empty/false).
 *
 * @internal
 */
export async function validateLicenceField(options: {
	licences: string[];
	allowedLicences?: string[];
	validateSpdx: boolean;
	shouldResolve: boolean;
	filePath: string;
	manualFixMessage: string;
}): Promise<PolicyResult> {
	const {
		licences,
		allowedLicences,
		validateSpdx,
		shouldResolve,
		filePath,
		manualFixMessage,
	} = options;

	// Check allowlist first (takes priority)
	if (allowedLicences) {
		const errors = validateAllowlist(licences, allowedLicences);
		if (errors.length > 0) {
			return errors.map((message) => ({
				message,
				manualFix: manualFixMessage,
			}));
		}
	}

	// Validate with spdx-correct
	if (validateSpdx) {
		const { errors, corrections } = await validateWithSpdxCorrect(licences);
		if (errors.length > 0) {
			if (shouldResolve && corrections.size > 0) {
				const findings = await tryAutoFix(filePath, corrections, errors);
				return findings.map((finding) => ({
					...finding,
					manualFix: manualFixMessage,
				}));
			}
			return errors.map((message) => ({
				message,
				fixStatus: [...corrections].some(
					([original, corrected]) =>
						message === `Licence "${original}" should be "${corrected}"`,
				)
					? "available"
					: undefined,
				manualFix: manualFixMessage,
			}));
		}
	}

	return [];
}
