type ConcurrentlyCommand = `concurrently ${string}`;

export function isConcurrentlyCommand(
	command: string,
): command is ConcurrentlyCommand {
	return command.startsWith("concurrently ");
}

/**
 * Regular expression to parse `concurrently` arguments that specify package scripts.
 * The format is `npm:<script>` or `"npm:<script>*"`; in the latter case script
 * is a prefix that is used to match one or more package scripts.
 * Quotes are optional but expected to escape the `*` character.
 */
const regexNpmConcurrentlySpec =
	/^(?<quote>"?)npm:(?<script>[^*]+?)(?<wildcard>\*?)\k<quote>$/;

/**
 * Regular expression to split concurrently command steps by spaces
 */
const regexSpaceSplit = / +/;

/**
 * Parses a `concurrently` command and calls callbacks for the sub-commands.
 * @param onNpmCommand - callback for each npm script specified in the command
 * @param onDirectCommand - callback for each direct command (not npm script) specified in the command
 */
export function parseConcurrentlyCommand(
	command: ConcurrentlyCommand,
	scriptNames: string[],
	onNpmCommand: (scriptName: string) => void,
	// biome-ignore lint/nursery/noShadow: callback parameter name matches outer scope for semantic clarity - represents the command being processed
	onDirectCommand: (command: string) => void,
): void {
	const steps = command.substring("concurrently ".length).split(regexSpaceSplit);
	for (const step of steps) {
		const npmMatch = regexNpmConcurrentlySpec.exec(step);
		if (npmMatch?.groups !== undefined) {
			const scriptSpec = npmMatch.groups.script;
			// When npm:... ends with *, it is a wildcard match of all scripts that start with the prefix.
			if (npmMatch.groups.wildcard === "*") {
				// Note: result of no matches is allowed, so long as another concurrently step has a match.
				// This avoids general tool being overly prescriptive about script patterns. If always
				// having a match is desired, then such a policy should be enforced.
				for (const scriptName of scriptNames.filter((s) =>
					s.startsWith(scriptSpec),
				)) {
					onNpmCommand(scriptName);
				}
			} else {
				onNpmCommand(scriptSpec);
			}
		} else {
			onDirectCommand(step);
		}
	}
}
