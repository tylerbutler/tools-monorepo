import type { Logger } from "@tylerbu/cli-api";
import type { SimpleGit } from "simple-git";

/**
 * Simple package.json interface for testing
 */
export interface TestPackageJson {
	name: string;
	version: string;
	scripts?: Record<string, string>;
	sail?: {
		tasks?: Record<string, any>;
		declarativeTasks?: Record<string, any>;
	};
	fluidBuild?: {
		tasks?: Record<string, any>;
		declarativeTasks?: Record<string, any>;
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
		taskDefinitions: Record<string, any>;
		declarativeTasks?: Record<string, any>;
	};
	buildProjectConfig: any;
	repoRoot: string;
	gitRepo: SimpleGit;
	gitRoot: string;
	log: Logger;
}

/**
 * Test utilities for creating mock objects and test data
 */
export class TestDataBuilder {
	/**
	 * Creates a mock BuildPackage for testing
	 */
	static createMockBuildPackage(
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
			getScript: (scriptName: string) =>
				defaultPackageJson.scripts?.[scriptName],
		};

		return mockPackage;
	}

	/**
	 * Creates a mock BuildContext for testing
	 */
	static createMockBuildContext(
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

		return {
			sailConfig: mockSailConfig,
			buildProjectConfig: mockBuildProjectConfig,
			repoRoot: "/test/repo",
			gitRepo: mockGitRepo,
			gitRoot: "/test/repo",
			log: mockLogger,
			...overrides,
		};
	}

	/**
	 * Creates a simple package.json for testing
	 */
	static createPackageJson(
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
	static createTaskDefinitions() {
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
}

/**
 * Test helper functions
 */
export class TestHelpers {
	/**
	 * Creates a temporary directory for test files
	 */
	static createTempDir(): string {
		// For now, return a mock path - in real implementation would create actual temp dir
		return "/tmp/test-" + Math.random().toString(36).substring(7);
	}

	/**
	 * Asserts that a function throws with a specific message
	 */
	static async assertThrows(
		fn: () => Promise<void> | void,
		expectedMessage?: string,
	): Promise<Error> {
		try {
			await fn();
			throw new Error("Expected function to throw, but it didn't");
		} catch (error) {
			if (expectedMessage && !error.message.includes(expectedMessage)) {
				throw new Error(
					`Expected error message to contain "${expectedMessage}", but got: ${error.message}`,
				);
			}
			return error as Error;
		}
	}

	/**
	 * Waits for a condition to be true
	 */
	static async waitFor(
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
}
