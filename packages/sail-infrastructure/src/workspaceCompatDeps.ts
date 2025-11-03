import { existsSync } from "node:fs";
import type { GlobOptions } from "tinyglobby";
import { globSync } from "tinyglobby";

/**
 * Dependencies for workspace compatibility operations.
 * Allows injection of filesystem and glob operations for testing.
 */
export interface WorkspaceCompatDeps {
	/**
	 * Check if a file exists at the given path.
	 */
	fileExists: (path: string) => boolean;

	/**
	 * Find files matching glob patterns.
	 */
	findFiles: (patterns: string[], options: GlobOptions) => string[];
}

/**
 * Create default dependencies using real filesystem and glob operations.
 */
export function createDefaultWorkspaceCompatDeps(): WorkspaceCompatDeps {
	return {
		fileExists: existsSync,
		findFiles: globSync,
	};
}
