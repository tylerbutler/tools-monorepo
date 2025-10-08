#!/usr/bin/env tsx
/**
 * CCL Test Data Sync Pipeline
 *
 * This script syncs test data from ccl-test-data repository to the viewer application.
 * It processes the JSON test files, generates TypeScript types, creates search indices,
 * and optimizes the data structure for the web application.
 */

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
			const reason = isCI ? "CI environment detected" : "CCL_SKIP_SYNC_IF_EXISTS=true";
			console.log(`✅ Generated data already exists, skipping sync (${reason})`);
			return;
		} catch {
			// Data doesn't exist, continue with sync
			console.log("📦 No existing data found, proceeding with sync...");
		}
	}

	// Load all test files
	const testFiles = await getAllTestFiles();
	console.log(`📁 Found ${testFiles.length} test files`);

	if (testFiles.length === 0) {
		console.error(
			"❌ No test files found. Make sure ccl-test-data is available.",
		);
		process.exit(1);
	}

	// Process each test file into categories
	const categories: TestCategory[] = [];

	for (const filePath of testFiles) {
		const filename = relative(DATA_SOURCE, filePath);
		const { name, description } = createCategoryFromFilename(filename);
		const { tests } = await loadTestFile(filePath);

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

	// Write processed data files
	await writeFile(
		join(DATA_TARGET, "categories.json"),
		JSON.stringify(categories, null, 2),
	);

	await writeFile(
		join(DATA_TARGET, "stats.json"),
		JSON.stringify(stats, null, 2),
	);

	await writeFile(
		join(DATA_TARGET, "search-index.json"),
		JSON.stringify(searchIndex, null, 2),
	);

	await writeFile(join(DATA_TARGET, "types.ts"), types);

	// Copy key files to static directory for runtime access
	await writeFile(
		join(STATIC_TARGET, "categories.json"),
		JSON.stringify(categories, null, 2),
	);

	await writeFile(
		join(STATIC_TARGET, "stats.json"),
		JSON.stringify(stats, null, 2),
	);

	await writeFile(
		join(STATIC_TARGET, "search-index.json"),
		JSON.stringify(searchIndex, null, 2),
	);

	// Create a summary file with metadata
	const summary = {
		generatedAt: new Date().toISOString(),
		source: relative(PROJECT_ROOT, DATA_SOURCE),
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
		JSON.stringify(summary, null, 2),
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
