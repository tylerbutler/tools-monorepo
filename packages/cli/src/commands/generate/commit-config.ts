import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { Flags } from "@oclif/core";
import { BaseCommand } from "@tylerbu/cli-api";
import {
	buildHierarchy,
	type CCLObject,
	getBool,
	getList,
	getString,
	parse,
} from "ccl-ts";
import { join, resolve } from "pathe";

interface CommitType {
	description: string;
	changelog_group: string | null;
	scope_required?: boolean;
}

interface Scope {
	display_name: string;
	in_changelog: boolean;
}

interface CommitTypesConfig {
	types: Record<string, CommitType>;
	scopes?: Record<string, Scope>;
	changelog_scope_order?: string[];
	commitlint_rules?: Record<string, unknown>;
}

/**
 * Check if a CCL value is a nested object.
 */
function isObject(value: unknown): value is CCLObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Get a string value from a CCL object, returning undefined on error.
 */
function getStringValue(obj: CCLObject, key: string): string | undefined {
	const result = getString(obj, key);
	return result.isOk ? result.value : undefined;
}

/**
 * Get a boolean value from a CCL object, returning the default on error.
 */
function getBoolValue(
	obj: CCLObject,
	key: string,
	defaultValue: boolean,
): boolean {
	const result = getBool(obj, key);
	return result.isOk ? result.value : defaultValue;
}

/**
 * Parse types section from CCL object.
 */
function parseTypes(typesObj: CCLObject): Record<string, CommitType> {
	const result: Record<string, CommitType> = {};
	for (const [typeName, typeConfig] of Object.entries(typesObj)) {
		if (isObject(typeConfig)) {
			const description = getStringValue(typeConfig, "description") ?? "";
			const changelogGroupRaw = getStringValue(typeConfig, "changelog_group");
			const changelogGroup = changelogGroupRaw || null;
			const scopeRequired = getBoolValue(typeConfig, "scope_required", false);

			result[typeName] = {
				description,
				changelog_group: changelogGroup,
				scope_required: scopeRequired,
			};
		}
	}
	return result;
}

/**
 * Parse scopes section from CCL object.
 */
function parseScopes(scopesObj: CCLObject): Record<string, Scope> {
	const result: Record<string, Scope> = {};
	for (const [scopeName, scopeConfig] of Object.entries(scopesObj)) {
		if (isObject(scopeConfig)) {
			const displayName =
				getStringValue(scopeConfig, "display_name") ?? scopeName;
			const inChangelog = getBoolValue(scopeConfig, "in_changelog", true);

			result[scopeName] = {
				display_name: displayName,
				in_changelog: inChangelog,
			};
		}
	}
	return result;
}

/**
 * Parse a CCL object into a CommitTypesConfig.
 * Handles the conversion from CCL's string-based values to typed config.
 */
function parseCCLConfig(cclText: string): CommitTypesConfig {
	const entriesResult = parse(cclText);
	if (entriesResult.isErr) {
		throw new Error(`Failed to parse CCL: ${entriesResult.error.message}`);
	}

	const objResult = buildHierarchy(entriesResult.value);
	if (objResult.isErr) {
		throw new Error(
			`Failed to build CCL hierarchy: ${objResult.error.message}`,
		);
	}

	const obj = objResult.value;

	const config: CommitTypesConfig = {
		types: {},
	};

	// Parse types
	const typesObj = obj["types"];
	if (isObject(typesObj)) {
		config.types = parseTypes(typesObj);
	}

	// Parse scopes
	const scopesObj = obj["scopes"];
	if (isObject(scopesObj)) {
		config.scopes = parseScopes(scopesObj);
	}

	// Parse changelog_scope_order (list of strings)
	const listResult = getList(obj, "changelog_scope_order");
	if (listResult.isOk) {
		config.changelog_scope_order = listResult.value;
	}

	return config;
}

export default class GenerateCommitConfig extends BaseCommand<
	typeof GenerateCommitConfig
> {
	public static override readonly description =
		"Generate cliff.toml and commitlint config from commit-types.ccl";

	public static override readonly examples = [
		"<%= config.bin %> <%= command.id %>",
		"<%= config.bin %> <%= command.id %> --dry-run",
		"<%= config.bin %> <%= command.id %> --cwd ../my-project",
	];

	public static override readonly flags = {
		"dry-run": Flags.boolean({
			char: "n",
			description: "Preview generated files without writing",
			default: false,
		}),
		cwd: Flags.string({
			description: "Target directory containing commit-types.ccl",
			default: ".",
		}),
		...BaseCommand.flags,
	};

	public override async run(): Promise<void> {
		const { flags } = await this.parse(GenerateCommitConfig);
		const targetDir = resolve(flags.cwd);
		const configPath = join(targetDir, "commit-types.ccl");

		if (!existsSync(configPath)) {
			this.error(`commit-types.ccl not found in ${targetDir}`);
		}

		const cclText = readFileSync(configPath, "utf-8");
		const config = parseCCLConfig(cclText);
		const hasScopes =
			config.scopes !== undefined && Object.keys(config.scopes).length > 0;

		// Generate cliff.toml
		const cliffContent = hasScopes
			? this.generateCliffWithScopes(config)
			: this.generateCliffSimple(config);

		// Generate commitlint config
		const commitlintContent = hasScopes
			? this.generateCommitlintWithScopes(config)
			: this.generateCommitlintSimple(config);

		const commitlintFileName = hasScopes
			? "commitlint.config.cjs"
			: ".commitlintrc.json";

		if (flags["dry-run"]) {
			this.log("=== cliff.toml ===");
			this.log(cliffContent);
			this.log(`\n=== ${commitlintFileName} ===`);
			this.log(commitlintContent);
		} else {
			const cliffPath = join(targetDir, "cliff.toml");
			const commitlintPath = join(targetDir, commitlintFileName);

			writeFileSync(cliffPath, cliffContent);
			this.log(`Wrote ${cliffPath}`);

			writeFileSync(commitlintPath, commitlintContent);
			this.log(`Wrote ${commitlintPath}`);
		}
	}

	private generateCliffSimple(config: CommitTypesConfig): string {
		const parsers = Object.entries(config.types)
			.map(([type, { changelog_group }]) =>
				changelog_group
					? `    { message = "^${type}", group = "${changelog_group}" },`
					: `    { message = "^${type}", skip = true },`,
			)
			.join("\n");

		return `# git-cliff config
# Auto-generated from commit-types.ccl - edit that file instead

[changelog]
header = """
# Changelog\\n
All notable changes will be documented in this file.\\n
"""
body = """
{% if version %}\\
## [{{ version | trim_start_matches(pat="v") }}] - {{ timestamp | date(format="%Y-%m-%d") }}
{% else %}\\
## [Unreleased]
{% endif %}\\
{% for group, commits in commits | group_by(attribute="group") %}\\
{% if group != "_ignored" %}
### {{ group | upper_first }}
{% for commit in commits %}\\
- {{ commit.message | upper_first }}{% if commit.scope %} ({{ commit.scope }}){%- endif %}
{% endfor %}
{% endif %}\\
{% endfor %}
"""
footer = ""
trim = true

[git]
conventional_commits = true
filter_unconventional = true
split_commits = false
commit_parsers = [
${parsers}
    # Catch-all for ignored commits
    { message = ".*", group = "_ignored" },
]
filter_commits = false
tag_pattern = "v[0-9].*"

[bump]
features_always_bump_minor = true
breaking_always_bump_major = true
`;
	}

	private generateCliffWithScopes(config: CommitTypesConfig): string {
		const scopes = config.scopes ?? {};
		const scopeOrder = config.changelog_scope_order ?? Object.keys(scopes);

		// Scope mappings
		const scopeMappings = Object.entries(scopes)
			.map(([scope, info]) => `${scope} = "${info.display_name}"`)
			.join("\n");

		// Skip parsers for types without changelog groups
		const skipTypeLines = Object.entries(config.types)
			.filter(([, { changelog_group }]) => changelog_group === null)
			.map(([type]) => `    { message = "^${type}", skip = true },`);

		// Skip parsers for scopes not in changelog
		const skipScopeLines = Object.entries(scopes)
			.filter(([, info]) => !info.in_changelog)
			.map(([scope]) => `    { scope = "${scope}", skip = true },`);

		const skipParsers = [...skipTypeLines, ...skipScopeLines].join("\n");

		// Group parsers for types with changelog groups
		const groupParsers = Object.entries(config.types)
			.filter(([, { changelog_group }]) => changelog_group !== null)
			.map(
				([type, { changelog_group }]) =>
					`    { message = "^${type}", group = "${changelog_group}" },`,
			)
			.join("\n");

		return `# git-cliff config
# Auto-generated from commit-types.ccl - edit that file instead

[changelog]
header = """
# Changelog\\n
All notable changes will be documented in this file.\\n
"""
body = """
{% if version %}\\
    ## [{{ version | trim_start_matches(pat="v") }}] - {{ timestamp | date(format="%Y-%m-%d") }}
{% else %}\\
    ## [Unreleased]
{% endif %}\\
{% set scope_order = ${JSON.stringify(scopeOrder)} %}\\
{% for scope_name in scope_order %}\\
    {% set scope_commits = commits | filter(attribute="scope", value=scope_name) %}\\
    {% if scope_commits | length > 0 %}\\
    ### {{ scope_name | replace(from="-", to=" ") | title }}
    {% for group, grouped_commits in scope_commits | group_by(attribute="group") %}\\
        #### {{ group | striptags | trim | upper_first }}
        {% for commit in grouped_commits %}\\
            - {{ commit.message | upper_first }}
        {% endfor %}
    {% endfor %}
    {% endif %}\\
{% endfor %}
"""
footer = ""
trim = true

[changelog.scopes]
${scopeMappings}

[git]
conventional_commits = true
filter_unconventional = true
split_commits = false
commit_parsers = [
    # Skip noise
${skipParsers}

    # Group by type
${groupParsers}
]
filter_commits = false
tag_pattern = "v[0-9].*"

[bump]
features_always_bump_minor = true
breaking_always_bump_major = true
`;
	}

	private generateCommitlintSimple(config: CommitTypesConfig): string {
		const types = Object.keys(config.types);
		const rules = config.commitlint_rules ?? {};

		const commitlintConfig = {
			extends: ["@commitlint/config-conventional"],
			rules: {
				"type-enum": [2, "always", types],
				...rules,
			},
		};

		return `${JSON.stringify(commitlintConfig, null, 2)}\n`;
	}

	private generateCommitlintWithScopes(config: CommitTypesConfig): string {
		const scopes = config.scopes ?? {};
		const scopeList = Object.keys(scopes);

		// Find types that require scopes
		const scopeRequiredTypes = Object.entries(config.types)
			.filter(([, { scope_required }]) => scope_required === true)
			.map(([type]) => type);

		// Generate selective-scope rules
		const scopeRules = scopeRequiredTypes
			.map((type) => `        ${type}: ${JSON.stringify(scopeList)},`)
			.join("\n");

		return `/** @type {import('@commitlint/types').UserConfig} */
// Auto-generated from commit-types.ccl - edit that file instead
module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: ['selective-scope'],
  rules: {
    // Disable default scope rules - we use selective-scope instead
    'scope-empty': [0],
    'scope-enum': [0],

    // Allowed scopes per type
    // - Types listed with array: scope REQUIRED, must be from the list
    // - Types not listed: scope not enforced
    'selective-scope': [
      2,
      'always',
      {
${scopeRules}
      },
    ],
  },
};
`;
	}
}
