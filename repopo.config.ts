import { makePolicy, type RepopoConfig } from "repopo";
import {
	LicenseFileExists,
	NoJsFileExtensions,
	NoLargeBinaryFiles,
	NoPrivateWorkspaceDependencies,
	PackageAllowedScopes,
	PackageEsmType,
	PackageFolderName,
	PackageJsonProperties,
	PackageJsonRepoDirectoryProperty,
	PackageJsonSorted,
	PackageLicense,
	PackagePrivateField,
	PackageScripts,
	PackageTestScripts,
	RequiredGitignorePatterns,
} from "repopo/policies";
import { SortTsconfigsPolicy } from "sort-tsconfig";

// Vendored packages (git subrepo) - exclude from policies that enforce monorepo conventions
const vendoredPackages = ["packages/btree-typescript"];
const vendoredPackageJsons = vendoredPackages.map((p) => `${p}/package.json`);

const config: RepopoConfig = {
	excludeFiles: ["test/data", "fixtures", "config/package.json"],
	policies: [
		makePolicy(NoJsFileExtensions, undefined, {
			excludeFiles: [
				".*/bin/.*js",
				".lighthouserc.js",
				"svelte.config.js",
				"tailwind.config.js",
				...vendoredPackages,
			],
		}),
		makePolicy(
			PackageJsonProperties,
			{
				verbatim: {
					license: "MIT",
					author: "Tyler Butler <tyler@tylerbutler.com>",
					bugs: "https://github.com/tylerbutler/tools-monorepo/issues",
					repository: {
						type: "git",
						url: "git+https://github.com/tylerbutler/tools-monorepo.git",
					},
				},
			},
			{
				excludeFiles: vendoredPackageJsons,
			},
		),
		makePolicy(PackageJsonRepoDirectoryProperty),
		makePolicy(PackageJsonSorted, undefined, {
			excludeFiles: vendoredPackageJsons,
		}),
		makePolicy(
			PackageScripts,
			{
				must: ["clean", "release:license"],
				mutuallyExclusive: [["test:unit", "test:vitest"]],
				conditionalRequired: [
					{
						ifPresent: "test",
						requires: [{ "test:coverage": "vitest run --coverage" }],
					},
				],
			},
			{
				excludeFiles: [
					"packages/.*-docs/package.json",
					...vendoredPackageJsons,
				],
			},
		),
		makePolicy(SortTsconfigsPolicy),
		makePolicy(NoPrivateWorkspaceDependencies),
		makePolicy(LicenseFileExists),
		makePolicy(NoLargeBinaryFiles),
		makePolicy(PackageEsmType),
		makePolicy(
			PackageFolderName,
			{
				stripScopes: ["@tylerbu"],
			},
			{
				excludeFiles: ["package.json", ...vendoredPackageJsons],
			},
		),
		makePolicy(
			PackageAllowedScopes,
			{
				allowedScopes: ["@tylerbu"],
				unscopedPackages: [
					"dill-cli",
					"dill-docs",
					"rehype-footnotes",
					"remark-lazy-links",
					"remark-repopo-policies",
					"remark-shift-headings",
					"remark-task-table",
					"repopo",
					"repopo-docs",
					"sort-tsconfig",
					"tools-monorepo",
				],
			},
			{
				excludeFiles: vendoredPackageJsons,
			},
		),
		makePolicy(
			PackagePrivateField,
			{
				mustBePrivate: ["*-docs", "@tylerbu/levee-client"],
				unmatchedPackages: "ignore",
			},
			{
				excludeFiles: vendoredPackageJsons,
			},
		),
		makePolicy(PackageLicense, undefined, {
			excludeFiles: vendoredPackageJsons,
		}),
		// PackageReadme disabled - too opinionated about title matching
		makePolicy(PackageTestScripts, undefined, {
			excludeFiles: [...vendoredPackageJsons, "packages/.*-docs/package.json"],
		}),
		makePolicy(RequiredGitignorePatterns, {
			patterns: [
				{ pattern: "node_modules/", comment: "Dependencies" },
				{ pattern: ".env", comment: "Environment files" },
				{ pattern: ".env.*", comment: "Environment files" },
				{ pattern: "!.env.example", comment: "Allow example env file" },
				{ pattern: ".DS_Store", comment: "macOS system files" },
				{ pattern: "Thumbs.db", comment: "Windows system files" },
				// Lockfile enforcement - only pnpm-lock.yaml should be committed
				{ pattern: "package-lock.json", comment: "npm lockfile (use pnpm)" },
				{ pattern: "yarn.lock", comment: "yarn lockfile (use pnpm)" },
			],
		}),
	],
};

export default config;
