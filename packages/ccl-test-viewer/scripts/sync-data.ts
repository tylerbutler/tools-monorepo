#!/usr/bin/env tsx
/**
 * CCL Test Data Sync Pipeline
 *
 * This script syncs test data from ccl-test-data repository to the viewer application.
 * It fetches JSON test files from the GitHub repository, generates TypeScript types,
 * creates search indices, and optimizes the data structure for the web application.
 */

// @biomejs/js-api is currently in alpha, but provides programmatic formatting
// See: https://github.com/biomejs/biome/tree/main/packages/@biomejs/js-api
import { Biome } from "@biomejs/js-api/nodejs";
import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import { join, relative, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const DATA_SOURCE = resolve(
	PROJECT_ROOT,
	"../../../ccl-test-data/generated_tests",
);
const DATA_TARGET = resolve(PROJECT_ROOT, "src/lib/data");
const STATIC_TARGET = resolve(PROJECT_ROOT, "static/data");

// GitHub repository configuration
const GITHUB_REPO = "tylerbutler/ccl-test-data";
const GITHUB_BRANCH = "main";
const GITHUB_PATH = "generated_tests";
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_REPO}`;
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}`;

interface GeneratedTest {
	name: string;
	input: string;
	validation: string;
	expected: {
		count: number;
		entries?: Array<{ key: string; value: string }>;
		object?: any;
		value?: any;
		list?: any[];
		error?: boolean;
	};
	functions: string[];
	features: string[];
	behaviors: string[];
	variants: string[];
	source_test: string;
}

interface TestCategory {
	name: string;
	description: string;
	tests: GeneratedTest[];
	file: string;
}

interface TestStats {
	totalTests: number;
	totalAssertions: number;
	categories: Record<string, number>;
	functions: Record<string, number>;
	features: Record<string, number>;
	behaviors: Record<string, number>;
}

interface SearchIndex {
	byName: Record<string, string[]>;
	byInput: Record<string, string[]>;
	byFunction: Record<string, string[]>;
	byFeature: Record<string, string[]>;
}

async function ensureDir(path: string): Promise<void> {
	try {
		await mkdir(path, { recursive: true });
	} catch (error) {
		// Directory might already exist
	}
}

async function getGitHubToken(): Promise<string | undefined> {
	// Try to get token from environment variable first
	if (process.env.GITHUB_TOKEN) {
		return process.env.GITHUB_TOKEN;
	}

	// Try to get token from gh CLI
	try {
		const { execSync } = await import("child_process");
		const token = execSync("gh auth token", { encoding: "utf-8" }).trim();
		return token;
	} catch {
		return undefined;
	}
}

async function fetchFromGitHub(path: string, token?: string): Promise<string> {
	const url = `${GITHUB_RAW_BASE}/${path}`;
	try {
		const headers: Record<string, string> = {};
		if (token) {
			// Use Bearer token format for OAuth, fallback to 'token' for PAT
			// GitHub supports both, but Bearer is preferred for OAuth tokens
			headers.Authorization = `Bearer ${token}`;
		}
		const response = await fetch(url, { headers });
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		return await response.text();
	} catch (error) {
		throw new Error(`Failed to fetch ${url}: ${error}`);
	}
}

async function listGitHubDirectory(
	path: string,
	token?: string,
): Promise<string[]> {
	const url = `${GITHUB_API_BASE}/contents/${path}?ref=${GITHUB_BRANCH}`;
	try {
		const headers: Record<string, string> = {
			Accept: "application/vnd.github.v3+json",
		};
		if (token) {
			// Use Bearer token format for OAuth, fallback to 'token' for PAT
			headers.Authorization = `Bearer ${token}`;
		}
		const response = await fetch(url, { headers });
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		const data = (await response.json()) as Array<{
			name: string;
			type: string;
		}>;
		return data
			.filter((item) => item.type === "file" && item.name.endsWith(".json"))
			.map((item) => item.name);
	} catch (error) {
		throw new Error(`Failed to list GitHub directory ${path}: ${error}`);
	}
}

async function loadTestFile(
	filePath: string,
): Promise<{ tests: GeneratedTest[] }> {
	try {
		const content = await readFile(filePath, "utf-8");
		return JSON.parse(content);
	} catch (error) {
		console.error(`Failed to load test file ${filePath}:`, error);
		return { tests: [] };
	}
}

async function loadTestFileFromGitHub(
	filename: string,
	token?: string,
): Promise<{ tests: GeneratedTest[] }> {
	try {
		const path = `${GITHUB_PATH}/${filename}`;
		const content = await fetchFromGitHub(path, token);
		return JSON.parse(content);
	} catch (error) {
		console.error(`Failed to load test file ${filename} from GitHub:`, error);
		return { tests: [] };
	}
}

async function getAllTestFiles(): Promise<string[]> {
	try {
		const entries = await readdir(DATA_SOURCE);
		const jsonFiles = entries.filter((file) => file.endsWith(".json"));
		return jsonFiles.map((file) => join(DATA_SOURCE, file));
	} catch (error) {
		console.error("Failed to read test data directory:", error);
		return [];
	}
}

async function getAllTestFilesFromGitHub(token?: string): Promise<string[]> {
	try {
		const files = await listGitHubDirectory(GITHUB_PATH, token);
		console.log(`📁 Found ${files.length} test files in GitHub repository`);
		return files;
	} catch (error) {
		console.error("Failed to list GitHub repository:", error);
		return [];
	}
}

function createCategoryFromFilename(filename: string): {
	name: string;
	description: string;
} {
	const base = filename.replace(".json", "").replace("api_", "");

	const categoryMap: Record<string, { name: string; description: string }> = {
		core_ccl_parsing: {
			name: "Core Parsing",
			description: "Basic CCL parsing functionality",
		},
		core_ccl_hierarchy: {
			name: "Hierarchy Building",
			description: "Object construction and hierarchy building",
		},
		core_ccl_integration: {
			name: "Integration",
			description: "Cross-function integration tests",
		},
		typed_access: {
			name: "Typed Access",
			description: "Type-safe value extraction (GetString, GetInt, etc.)",
		},
		list_access: {
			name: "List Operations",
			description: "List-specific operations and coercion",
		},
		advanced_processing: {
			name: "Advanced Processing",
			description: "Complex processing and composition",
		},
		comments: {
			name: "Comments",
			description: "Comment syntax and filtering",
		},
		edge_cases: {
			name: "Edge Cases",
			description: "Boundary conditions and edge cases",
		},
		errors: {
			name: "Error Handling",
			description: "Error handling and validation",
		},
		experimental: {
			name: "Experimental",
			description: "Experimental features and functionality",
		},
	};

	return (
		categoryMap[base] || {
			name: base.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
			description: `${base.replace(/_/g, " ")} functionality`,
		}
	);
}

function generateTestStats(categories: TestCategory[]): TestStats {
	const stats: TestStats = {
		totalTests: 0,
		totalAssertions: 0,
		categories: {},
		functions: {},
		features: {},
		behaviors: {},
	};

	for (const category of categories) {
		stats.totalTests += category.tests.length;
		stats.categories[category.name] = category.tests.length;

		for (const test of category.tests) {
			stats.totalAssertions += test.expected.count;

			// Count functions
			for (const func of test.functions) {
				stats.functions[func] = (stats.functions[func] || 0) + 1;
			}

			// Count features
			for (const feature of test.features) {
				stats.features[feature] = (stats.features[feature] || 0) + 1;
			}

			// Count behaviors
			for (const behavior of test.behaviors) {
				stats.behaviors[behavior] = (stats.behaviors[behavior] || 0) + 1;
			}
		}
	}

	return stats;
}

function generateSearchIndex(categories: TestCategory[]): SearchIndex {
	const index: SearchIndex = {
		byName: {},
		byInput: {},
		byFunction: {},
		byFeature: {},
	};

	for (const category of categories) {
		for (const test of category.tests) {
			// Index by name
			const nameTokens = test.name.toLowerCase().split(/[_\s-]+/);
			for (const token of nameTokens) {
				if (!index.byName[token]) index.byName[token] = [];
				index.byName[token].push(test.name);
			}

			// Index by input content
			const inputTokens = test.input.toLowerCase().split(/[=\s\n]+/);
			for (const token of inputTokens.filter((t) => t.length > 2)) {
				if (!index.byInput[token]) index.byInput[token] = [];
				index.byInput[token].push(test.name);
			}

			// Index by functions
			for (const func of test.functions) {
				if (!index.byFunction[func]) index.byFunction[func] = [];
				index.byFunction[func].push(test.name);
			}

			// Index by features
			for (const feature of test.features) {
				if (!index.byFeature[feature]) index.byFeature[feature] = [];
				index.byFeature[feature].push(test.name);
			}
		}
	}

	return index;
}

async function generateTypeDefinitions(
	categories: TestCategory[],
): Promise<string> {
	const allFunctions = new Set<string>();
	const allFeatures = new Set<string>();
	const allBehaviors = new Set<string>();

	for (const category of categories) {
		for (const test of category.tests) {
			test.functions.forEach((f) => allFunctions.add(f));
			test.features.forEach((f) => allFeatures.add(f));
			test.behaviors.forEach((b) => allBehaviors.add(b));
		}
	}

	return `// Generated TypeScript definitions for CCL test data
// Do not edit manually - regenerated by sync-data.ts

export interface GeneratedTest {
	name: string;
	input: string;
	validation: string;
	expected: {
		count: number;
		entries?: Array<{ key: string; value: string }>;
		object?: any;
		value?: any;
		list?: any[];
		error?: boolean;
	};
	functions: string[];
	features: string[];
	behaviors: string[];
	variants: string[];
	source_test: string;
}

export interface TestCategory {
	name: string;
	description: string;
	tests: GeneratedTest[];
	file: string;
}

export interface TestStats {
	totalTests: number;
	totalAssertions: number;
	categories: Record<string, number>;
	functions: Record<string, number>;
	features: Record<string, number>;
	behaviors: Record<string, number>;
}

export interface SearchIndex {
	byName: Record<string, string[]>;
	byInput: Record<string, string[]>;
	byFunction: Record<string, string[]>;
	byFeature: Record<string, string[]>;
}

// Enum types for better type safety
export type CCLFunction = ${Array.from(allFunctions)
		.map((f) => `"${f}"`)
		.join(" | ")};
export type CCLFeature = ${Array.from(allFeatures)
		.map((f) => `"${f}"`)
		.join(" | ")};
export type CCLBehavior = ${Array.from(allBehaviors)
		.map((b) => `"${b}"`)
		.join(" | ")};

// Available functions for filtering
export const AVAILABLE_FUNCTIONS: CCLFunction[] = [${Array.from(allFunctions)
		.map((f) => `"${f}"`)
		.join(", ")}];

// Available features for filtering
export const AVAILABLE_FEATURES: CCLFeature[] = [${Array.from(allFeatures)
		.map((f) => `"${f}"`)
		.join(", ")}];

// Available behaviors for filtering
export const AVAILABLE_BEHAVIORS: CCLBehavior[] = [${Array.from(allBehaviors)
		.map((b) => `"${b}"`)
		.join(", ")}];
`;
}

async function main(): Promise<void> {
	console.log("🔄 Starting CCL test data sync...");

	// Ensure target directories exist
	await ensureDir(DATA_TARGET);
	await ensureDir(STATIC_TARGET);

	// Detect CI environment - check common CI env vars
	const isCI =
		process.env.CI === "true" ||
		process.env.GITHUB_ACTIONS === "true" ||
		process.env.NETLIFY === "true" ||
		process.env.VERCEL === "1";

	const skipIfExists = process.env.CCL_SKIP_SYNC_IF_EXISTS === "true" || isCI;

	if (skipIfExists) {
		try {
			// Check if generated data already exists
			const categoriesPath = join(DATA_TARGET, "categories.json");
			await stat(categoriesPath);
			const reason = isCI
				? "CI environment detected"
				: "CCL_SKIP_SYNC_IF_EXISTS=true";
			console.log(
				`✅ Generated data already exists, skipping sync (${reason})`,
			);
			return;
		} catch {
			// Data doesn't exist, continue with sync
			console.log("📦 No existing data found, proceeding with sync...");
		}
	}

	// Determine data source: GitHub or local filesystem
	const useGitHub = process.env.CCL_USE_GITHUB !== "false"; // Default to GitHub
	let testFilenames: string[] = [];
	let githubToken: string | undefined;

	if (useGitHub) {
		console.log(`🌐 Fetching test data from GitHub: ${GITHUB_REPO}`);
		githubToken = await getGitHubToken();
		if (githubToken) {
			console.log(`🔑 Using GitHub authentication token`);
		} else {
			console.log(`⚠️  No GitHub token found - using unauthenticated access`);
		}
		testFilenames = await getAllTestFilesFromGitHub(githubToken);
	} else {
		console.log(`📁 Loading test data from local filesystem`);
		const testFiles = await getAllTestFiles();
		testFilenames = testFiles.map((path) => relative(DATA_SOURCE, path));
	}

	console.log(`📁 Found ${testFilenames.length} test files`);

	if (testFilenames.length === 0) {
		console.error(
			"❌ No test files found. Make sure ccl-test-data is available.",
		);
		process.exit(1);
	}

	// Process each test file into categories
	const categories: TestCategory[] = [];

	for (const filename of testFilenames) {
		const { name, description } = createCategoryFromFilename(filename);
		const { tests } = useGitHub
			? await loadTestFileFromGitHub(filename, githubToken)
			: await loadTestFile(join(DATA_SOURCE, filename));

		categories.push({
			name,
			description,
			tests,
			file: filename,
		});

		console.log(`📊 Loaded ${tests.length} tests from ${name}`);
	}

	// Generate statistics
	const stats = generateTestStats(categories);
	console.log(
		`📈 Generated stats: ${stats.totalTests} tests, ${stats.totalAssertions} assertions`,
	);

	// Generate search index
	const searchIndex = generateSearchIndex(categories);
	console.log(
		`🔍 Generated search index with ${Object.keys(searchIndex.byName).length} name tokens`,
	);

	// Generate TypeScript definitions
	const types = await generateTypeDefinitions(categories);

	// Initialize Biome for formatting generated files to match project style
	const biome = new Biome();
	const { projectKey } = biome.openProject(PROJECT_ROOT);

	const formatJson = (data: unknown, filePath: string): string => {
		const json = JSON.stringify(data);
		return biome.formatContent(projectKey, json, { filePath }).content;
	};

	const formatTs = (content: string, filePath: string): string => {
		return biome.formatContent(projectKey, content, { filePath }).content;
	};

	// Write processed data files
	await writeFile(
		join(DATA_TARGET, "categories.json"),
		formatJson(categories, "categories.json"),
	);

	await writeFile(
		join(DATA_TARGET, "stats.json"),
		formatJson(stats, "stats.json"),
	);

	await writeFile(
		join(DATA_TARGET, "search-index.json"),
		formatJson(searchIndex, "search-index.json"),
	);

	await writeFile(join(DATA_TARGET, "types.ts"), formatTs(types, "types.ts"));

	// Copy key files to static directory for runtime access
	await writeFile(
		join(STATIC_TARGET, "categories.json"),
		formatJson(categories, "categories.json"),
	);

	await writeFile(
		join(STATIC_TARGET, "stats.json"),
		formatJson(stats, "stats.json"),
	);

	await writeFile(
		join(STATIC_TARGET, "search-index.json"),
		formatJson(searchIndex, "search-index.json"),
	);

	// Create a summary file with metadata
	const summary = {
		generatedAt: new Date().toISOString(),
		source: useGitHub
			? `GitHub: ${GITHUB_REPO}/${GITHUB_PATH} (${GITHUB_BRANCH})`
			: relative(PROJECT_ROOT, DATA_SOURCE),
		stats: {
			categories: categories.length,
			totalTests: stats.totalTests,
			totalAssertions: stats.totalAssertions,
			uniqueFunctions: Object.keys(stats.functions).length,
			uniqueFeatures: Object.keys(stats.features).length,
			uniqueBehaviors: Object.keys(stats.behaviors).length,
		},
	};

	await writeFile(
		join(DATA_TARGET, "sync-summary.json"),
		formatJson(summary, "sync-summary.json"),
	);

	console.log("✅ Data sync completed successfully!");
	console.log(`📦 Generated files in: ${relative(process.cwd(), DATA_TARGET)}`);
	console.log(`🌐 Static files in: ${relative(process.cwd(), STATIC_TARGET)}`);
	console.log(
		`📊 Summary: ${summary.stats.categories} categories, ${summary.stats.totalTests} tests, ${summary.stats.totalAssertions} assertions`,
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error("❌ Data sync failed:", error);
		process.exit(1);
	});
}
