import type { PolicyShape } from "../policy.js";
import {
	type CargoToml,
	defineCargoPolicy,
} from "../policyDefiners/defineCargoPolicy.js";

/**
 * Configuration for the CargoTomlRequired policy.
 *
 * @alpha
 */
export interface CargoTomlRequiredConfig {
	/**
	 * Fields that must exist in the [package] section.
	 * @defaultValue ["license", "description"]
	 */
	required?: string[];

	/**
	 * Minimum Rust edition to require (e.g., "2021").
	 * If set, the `edition` field must exist and be >= this value.
	 */
	minimumEdition?: string;

	/**
	 * If true, require the `rust-version` field (MSRV) to be set.
	 * @defaultValue false
	 */
	requireRustVersion?: boolean;

	/**
	 * Specific field values to enforce. Keys are field names, values are expected values.
	 */
	expectedValues?: Record<string, string>;
}

const DEFAULT_REQUIRED_FIELDS = ["license", "description"];
const VALID_EDITIONS = ["2015", "2018", "2021", "2024"];

function checkRequiredFields(
	pkg: Record<string, unknown>,
	config: CargoTomlRequiredConfig | undefined,
	errors: string[],
): void {
	const requiredFields = config?.required ?? DEFAULT_REQUIRED_FIELDS;
	for (const field of requiredFields) {
		if (pkg[field] === undefined) {
			errors.push(`Missing required field: package.${field}`);
		}
	}
}

function checkExpectedValues(
	pkg: Record<string, unknown>,
	config: CargoTomlRequiredConfig | undefined,
	errors: string[],
): void {
	if (!config?.expectedValues) {
		return;
	}
	for (const [field, expected] of Object.entries(config.expectedValues)) {
		const actual = pkg[field];
		if (actual === undefined) {
			errors.push(`Missing required field: package.${field}`);
		} else if (String(actual) !== expected) {
			errors.push(
				`Expected package.${field} = "${expected}", got "${String(actual)}"`,
			);
		}
	}
}

function checkRustVersion(
	pkg: Record<string, unknown>,
	config: CargoTomlRequiredConfig | undefined,
	errors: string[],
): void {
	if (config?.requireRustVersion && pkg["rust-version"] === undefined) {
		errors.push(
			"Missing package.rust-version (MSRV). Set the minimum supported Rust version.",
		);
	}
}

function checkMinimumEdition(
	pkg: Record<string, unknown>,
	config: CargoTomlRequiredConfig | undefined,
	errors: string[],
): void {
	if (!config?.minimumEdition) {
		return;
	}
	const edition = pkg.edition as string | undefined;
	if (edition === undefined) {
		errors.push("Missing package.edition field.");
	} else if (!VALID_EDITIONS.includes(edition)) {
		errors.push(
			`Invalid edition "${edition}". Must be one of: ${VALID_EDITIONS.join(", ")}`,
		);
	} else if (edition < config.minimumEdition) {
		errors.push(
			`Edition "${edition}" is below minimum "${config.minimumEdition}".`,
		);
	}
}

/**
 * A policy that enforces required fields exist in Cargo.toml [package] section.
 *
 * @alpha
 */
export const CargoTomlRequired: PolicyShape<CargoTomlRequiredConfig> =
	defineCargoPolicy({
		name: "CargoTomlRequired",
		description:
			"Ensures Cargo.toml files contain required fields in the [package] section.",
		handler: async (toml: CargoToml, { config }) => {
			const pkg = toml.package as Record<string, unknown> | undefined;
			if (!pkg) {
				// Workspace root Cargo.toml may not have [package]
				if (toml.workspace !== undefined) {
					return true;
				}
				return { error: "Missing [package] section in Cargo.toml" };
			}

			const errors: string[] = [];
			checkRequiredFields(pkg, config, errors);
			checkExpectedValues(pkg, config, errors);
			checkRustVersion(pkg, config, errors);
			checkMinimumEdition(pkg, config, errors);

			if (errors.length > 0) {
				return {
					error: errors.join("; "),
					manualFix:
						"Add the missing fields to your Cargo.toml [package] section.",
				};
			}

			return true;
		},
	});
