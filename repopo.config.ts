import {
	type FilePolicyDefinition,
	makePolicy,
	type RepopoConfig,
} from "repopo";
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
const treeSitterPackageJson = /^packages\/tree-sitter-ccl\/package\.json$/;
const NoPackageProjectJson = {
	name: "NoPackageProjectJson",
	description:
		"Keeps Nx task orchestration centralized instead of adding package-level project.json files.",
	match: /^packages\/.*\/project\.json$/,
	handler: async () => [
		{
			message:
				"Package-level project.json files split task configuration across competing locations.",
			manualFix: [
				"Put implementation commands in the package's package.json scripts.",
				"Put shared orchestration and task defaults in root nx.json.",
				"Use package.json nx.targets for package-specific target settings.",
				"Follow packages/repopo/package.json and nx.json as examples.",
				"Preserve required tasks and caching settings when migrating; do not delete functionality to pass this check.",
			].join("\n"),
		},
	],
} satisfies FilePolicyDefinition;

const config: RepopoConfig = {
	excludeFiles: ["test/data", "fixtures", "config/package.json"],
	policies: [
		makePolicy(NoPackageProjectJson, {
			exclude: vendoredPackages,
		}),
		makePolicy(NoJsFileExtensions, {
			exclude: [
				".*/bin/.*js",
				".lighthouserc.js",
				"svelte.config.js",
				"tailwind.config.js",
				// Tree-sitter requires this grammar filename.
				/^packages\/tree-sitter-ccl\/grammar\.js$/,
				...vendoredPackages,
			],
		}),
		makePolicy(PackageJsonProperties, {
			config: {
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
			exclude: vendoredPackageJsons,
		}),
		makePolicy(PackageJsonRepoDirectoryProperty),
		makePolicy(PackageJsonSorted, {
			exclude: vendoredPackageJsons,
		}),
		makePolicy(PackageScripts, {
			instanceId: "maintenance",
			config: {
				must: ["clean", "release:license"],
				mutuallyExclusive: [["test:unit", "test:vitest"]],
			},
			exclude: ["packages/.*-docs/package.json", ...vendoredPackageJsons],
		}),
		makePolicy(PackageScripts, {
			instanceId: "coverage",
			config: {
				conditionalRequired: [
					{
						ifPresent: "test",
						requires: [{ "test:coverage": "vitest run --coverage" }],
					},
				],
			},
			exclude: [
				"packages/.*-docs/package.json",
				...vendoredPackageJsons,
				treeSitterPackageJson,
			],
		}),
		makePolicy(SortTsconfigsPolicy, {
			exclude: vendoredPackages,
		}),
		makePolicy(NoPrivateWorkspaceDependencies),
		makePolicy(LicenseFileExists),
		makePolicy(NoLargeBinaryFiles),
		makePolicy(PackageEsmType, {
			config: { requiredType: "module" },
			exclude: vendoredPackageJsons,
		}),
		makePolicy(PackageFolderName, {
			config: {
				stripScopes: ["@tylerbu"],
			},
			exclude: ["package.json", ...vendoredPackageJsons],
		}),
		makePolicy(PackageAllowedScopes, {
			config: {
				allowedScopes: ["@tylerbu"],
				unscopedPackages: [
					"astro-tinylytics",
					"dill-cli",
					"dill-docs",
					"rehype-footnotes",
					"remark-lazy-links",
					"remark-repopo-policies",
					"remark-shift-headings",
					"remark-task-table",
					"remark-workspace-packages",
					"repopo",
					"repopo-docs",
					"sort-tsconfig",
					"tools-monorepo",
					"tree-sitter-ccl",
				],
			},
			exclude: vendoredPackageJsons,
		}),
		makePolicy(PackagePrivateField, {
			config: {
				mustBePrivate: ["*-docs"],
				unmatchedPackages: "ignore",
			},
			exclude: vendoredPackageJsons,
		}),
		makePolicy(PackageLicense, {
			exclude: vendoredPackageJsons,
		}),
		// PackageReadme disabled - too opinionated about title matching
		makePolicy(PackageTestScripts, {
			config: {
				testDirectories: ["test", "tests", "__tests__"],
				testDependencies: ["vitest", "jest", "mocha"],
				requiredScripts: ["test:coverage"],
			},
			exclude: [
				...vendoredPackageJsons,
				"packages/.*-docs/package.json",
				treeSitterPackageJson,
			],
		}),
		makePolicy(RequiredGitignorePatterns, {
			config: {
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
			},
		}),
	],
};

export default config;
