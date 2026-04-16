/**
 * Script dependency information
 */
export interface IScriptDependency {
	name: string;
	isDirect: boolean;
}

/**
 * Script analyzer interface for analyzing package.json scripts and extracting dependencies
 */
export interface IScriptAnalyzer {
	/**
	 * Extracts the directly called scripts from a command line
	 * @param script - command line to parse
	 * @param allScriptNames - all the script names in the package.json
	 * @returns elements of script that are other scripts
	 */
	getDirectlyCalledScripts(script: string, allScriptNames: string[]): string[];

	/**
	 * Analyzes all scripts in a package to build dependency relationships
	 */
	analyzeScriptDependencies(
		packageScripts: Record<string, string | undefined>,
	): Record<string, string[]>;

	/**
	 * Validates that all referenced scripts exist
	 */
	validateScriptReferences(script: string, allScriptNames: string[]): void;
}
