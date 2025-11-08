import type { IScriptAnalyzer } from "../interfaces/index.js";
import {
	isConcurrentlyCommand,
	parseConcurrentlyCommand,
} from "../parseCommands.js";

/**
 * ScriptAnalyzer handles analysis of package.json scripts to extract dependencies
 * and understand script relationships.
 */
export class ScriptAnalyzer implements IScriptAnalyzer {
	/**
	 * Extracts the directly called scripts from a command line
	 * @param script - command line to parse
	 * @param allScriptNames - all the script names in the package.json
	 * @returns elements of script that are other scripts
	 */
	public getDirectlyCalledScripts(
		script: string,
		allScriptNames: string[],
	): string[] {
		const directlyCalledScripts: string[] = [];
		const commands = script.split("&&");

		for (const step of commands) {
			const commandLine = step.trim();
			this.processCommand(commandLine, allScriptNames, directlyCalledScripts);
		}

		return directlyCalledScripts;
	}

	/**
	 * Analyzes all scripts in a package to build dependency relationships
	 */
	public analyzeScriptDependencies(
		packageScripts: Record<string, string | undefined>,
	): Record<string, string[]> {
		const allScriptNames = Object.keys(packageScripts);
		const dependencies: Record<string, string[]> = {};

		for (const [name, script] of Object.entries(packageScripts)) {
			if (script !== undefined) {
				const directlyCalledScripts = this.getDirectlyCalledScripts(
					script,
					allScriptNames,
				);
				if (directlyCalledScripts.length > 0) {
					dependencies[name] = directlyCalledScripts;
				}
			}
		}

		return dependencies;
	}

	/**
	 * Validates that all referenced scripts exist
	 */
	public validateScriptReferences(
		script: string,
		allScriptNames: string[],
	): void {
		const directlyCalledScripts = this.getDirectlyCalledScripts(
			script,
			allScriptNames,
		);

		for (const scriptName of directlyCalledScripts) {
			if (!allScriptNames.includes(scriptName)) {
				throw new Error(
					`Script '${scriptName}' not found processing command line: '${script}'`,
				);
			}
		}
	}

	private processCommand(
		commandLine: string,
		allScriptNames: string[],
		directlyCalledScripts: string[],
	): void {
		if (isConcurrentlyCommand(commandLine)) {
			this.processConcurrentlyCommand(
				commandLine,
				allScriptNames,
				directlyCalledScripts,
			);
		} else if (commandLine.startsWith("npm run ")) {
			this.processNpmRunCommand(
				commandLine,
				allScriptNames,
				directlyCalledScripts,
			);
		}
	}

	private processConcurrentlyCommand(
		commandLine: string,
		allScriptNames: string[],
		directlyCalledScripts: string[],
	): void {
		parseConcurrentlyCommand(
			commandLine as `concurrently ${string}`,
			allScriptNames,
			(scriptName: string) => {
				directlyCalledScripts.push(scriptName);
			},
			() => {
				// Handle non-script commands in concurrently (no-op for our purposes)
			},
		);
	}

	private processNpmRunCommand(
		commandLine: string,
		allScriptNames: string[],
		directlyCalledScripts: string[],
	): void {
		const scriptName = commandLine.substring("npm run ".length);

		// If the "script name" has a space, it's a "direct" call but probably
		// has additional arguments that change exact execution of the script
		// and therefore is excluded as a "direct" call.
		if (scriptName.includes(" ")) {
			return;
		}

		if (allScriptNames.includes(scriptName)) {
			directlyCalledScripts.push(scriptName);
		} else {
			// This may not be relevant to the calling context, but there aren't
			// any known reasons why this should be preserved; so raise as an error.
			throw new Error(
				`Script '${scriptName}' not found processing command line: '${commandLine}'`,
			);
		}
	}
}
