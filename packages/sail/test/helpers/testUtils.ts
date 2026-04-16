import type { Logger } from "@tylerbu/cli-api";
import type { SimpleGit } from "simple-git";
import type {
	TaskConfigOnDisk,
	TaskDefinitionsOnDisk,
} from "../../src/core/taskDefinitions.js";

/**
 * Simple package.json interface for testing
 */
export interface TestPackageJson {
	name: string;
	version: string;
	scripts?: Record<string, string>;
	sail?: {
		tasks?: TaskDefinitionsOnDisk;
		declarativeTasks?: Record<string, unknown>;
	};
	fluidBuild?: {
		tasks?: TaskDefinitionsOnDisk;
		declarativeTasks?: Record<string, unknown>;
	};
}

/**
 * Mock BuildPackage interface for testing
 */
export interface MockBuildPackage {
	name: string;
	nameColored: string;
	packagePath: string;
	packageJson: TestPackageJson;
	isReleaseGroupRoot: boolean;
	getScript: (scriptName: string) => string | undefined;
}

/**
 * Mock BuildContext interface for testing
 */
export interface MockBuildContext {
	sailConfig: {
		taskDefinitions: Record<string, TaskConfigOnDisk>;
		declarativeTasks?: Record<string, unknown>;
	};
	buildProjectConfig: unknown;
	repoRoot: string;
	gitRepo: SimpleGit;
	gitRoot: string;
	log: Logger;
}

/**
 * Creates a mock BuildPackage for testing
 */
export function createMockBuildPackage(
	overrides: Partial<{
		name: string;
		packagePath: string;
		packageJson: TestPackageJson;
		isReleaseGroupRoot: boolean;
	}> = {},
): MockBuildPackage {
	const defaultPackageJson: TestPackageJson = {
		name: overrides.name ?? "test-package",
		version: "1.0.0",
		scripts: {
			build: "tsc",
			test: "vitest",
			lint: "biome lint",
		},
	};

	const mockPackage: MockBuildPackage = {
		name: overrides.name ?? "test-package",
		nameColored: overrides.name ?? "test-package",
		packagePath: overrides.packagePath ?? "/test/package",
		packageJson: { ...defaultPackageJson, ...overrides.packageJson },
		isReleaseGroupRoot: overrides.isReleaseGroupRoot ?? false,
		getScript: (scriptName: string) => defaultPackageJson.scripts?.[scriptName],
	};

	return mockPackage;
}

/**
 * Creates a mock BuildContext for testing
 */
export function createMockBuildContext(
	overrides: Partial<MockBuildContext> = {},
): MockBuildContext {
	const mockLogger: Logger = {
		info: () => {},
		warn: () => {},
		error: () => {},
		verbose: () => {},
		debug: () => {},
	} as Logger;

	const mockGitRepo = {} as SimpleGit;

	const mockSailConfig = {
		taskDefinitions: {},
	};

	const mockBuildProjectConfig = {
		buildArtifacts: [],
	};

	// Create a mock task handler registry
	const mockTaskHandlerRegistry = {
		register: () => {},
		get: () => undefined,
		has: () => false,
		loadPlugin: async () => {},
		loadPlugins: async () => [],
		getRegisteredExecutables: () => [],
		clear: () => {},
	};

	return {
		sailConfig: mockSailConfig,
		buildProjectConfig: mockBuildProjectConfig,
		repoRoot: "/test/repo",
		gitRepo: mockGitRepo,
		gitRoot: "/test/repo",
		log: mockLogger,
		taskHandlerRegistry: mockTaskHandlerRegistry,
		...overrides,
	};
}

/**
 * Creates a simple package.json for testing
 */
export function createPackageJson(
	overrides: Partial<TestPackageJson> = {},
): TestPackageJson {
	return {
		name: "test-package",
		version: "1.0.0",
		scripts: {
			build: "tsc",
			test: "vitest",
			lint: "biome lint",
		},
		...overrides,
	};
}

/**
 * Creates test task definitions
 */
export function createTaskDefinitions() {
	return {
		build: {
			dependsOn: ["^build"],
			script: true,
			before: [],
			children: [],
			after: [],
		},
		test: {
			dependsOn: ["build"],
			script: true,
			before: [],
			children: [],
			after: [],
		},
	};
}

/**
 * Creates a temporary directory for test files
 */
export function createTempDir(): string {
	// For now, return a mock path - in real implementation would create actual temp dir
	return `/tmp/test-${Math.random().toString(36).substring(7)}`;
}

/**
 * Asserts that a function throws with a specific message
 */
export async function assertThrows(
	fn: () => Promise<void> | void,
	expectedMessage?: string,
): Promise<Error> {
	let caughtError: Error | undefined;
	try {
		await fn();
	} catch (error) {
		caughtError = error as Error;
	}

	if (!caughtError) {
		throw new Error("Expected function to throw, but it didn't");
	}

	if (expectedMessage && !caughtError.message.includes(expectedMessage)) {
		throw new Error(
			`Expected error message to contain "${expectedMessage}", but got: ${caughtError.message}`,
		);
	}

	return caughtError;
}

/**
 * Waits for a condition to be true
 */
export async function waitFor(
	condition: () => boolean | Promise<boolean>,
	timeout = 1000,
	interval = 10,
): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		if (await condition()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}
	throw new Error("Condition was not met within timeout");
}

/**
 * TestDataBuilder provides factory methods for creating test data
 */
export const TestDataBuilder = {
	createMockBuildPackage,
	createMockBuildContext,
	createPackageJson,
	createTaskDefinitions,
};

/**
 * TestHelpers provides utility functions for testing
 */
export const TestHelpers = {
	createTempDir,
	assertThrows,
	waitFor,
};
