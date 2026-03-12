/**
 * A regular expression that matches package.json files in path strings.
 */
export const PackageJsonRegexMatch = /(^|\/)package\.json/i;

/**
 * A regular expression that matches Cargo.toml files in path strings.
 */
export const CargoTomlRegexMatch = /(^|\/)Cargo\.toml$/;

/**
 * A regular expression that matches gleam.toml files in path strings.
 */
export const GleamTomlRegexMatch = /(^|\/)gleam\.toml$/;
