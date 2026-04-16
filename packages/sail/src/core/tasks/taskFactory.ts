import { getExecutableFromCommand } from "../../common/utils.js";
import type { BuildContext } from "../buildContext.js";
import type { BuildGraphPackage } from "../buildGraph.js";
import { GroupTask } from "./groupTask.js";
import { ApiExtractorTask } from "./leaf/apiExtractorTask.js";
import { BiomeTask } from "./leaf/biomeTasks.js";
import {
	JssmVizTask,
	MarkdownMagicTask,
	OclifManifestTask,
	OclifReadmeTask,
	SyncpackLintSemverRangesTask,
	SyncpackListMismatchesTask,
} from "./leaf/commonDeclarativeTasks.js";
import { createDeclarativeTaskHandler } from "./leaf/declarativeTask.js";
import {
	FlubCheckLayerTask,
	FlubCheckPolicyTask,
	FlubGenerateChangesetConfigTask,
	FlubGenerateTypeTestsTask,
	FlubListTask,
} from "./leaf/flubTasks.js";
import { GenerateEntrypointsTask } from "./leaf/generateEntrypointsTask.js";
import { UnknownLeafTask } from "./leaf/leafTask.js";
import { EsLintTask } from "./leaf/lintTasks.js";
import {
	CopyfilesTask,
	DepCruiseTask,
	EchoTask,
	GenVerTask,
	GoodFenceTask,
} from "./leaf/miscTasks.js";
import { PrettierTask } from "./leaf/prettierTask.js";
import { TscTask } from "./leaf/tscTask.js";
import { WebpackTask } from "./leaf/webpackTask.js";
import type { Task } from "./task.js";
import { isConstructorFunction, type TaskHandler } from "./taskHandlers.js";

// Map of executable name to LeafTasks
const executableToLeafTask: {
	[key: string]: TaskHandler;
} = {
	tsc: TscTask,
	"fluid-tsc": TscTask,
	eslint: EsLintTask,
	webpack: WebpackTask,
	"parallel-webpack": WebpackTask,
	copyfiles: CopyfilesTask,
	echo: EchoTask,
	prettier: PrettierTask,
	"gen-version": GenVerTask,
	gf: GoodFenceTask,
	"api-extractor": ApiExtractorTask,
	"flub check layers": FlubCheckLayerTask,
	"flub check policy": FlubCheckPolicyTask,
	"flub generate changeset-config": FlubGenerateChangesetConfigTask,
	"flub generate entrypoints": GenerateEntrypointsTask,
	"flub generate typetests": FlubGenerateTypeTestsTask,
	depcruise: DepCruiseTask,
	"biome check": BiomeTask,
	"biome format": BiomeTask,

	// flub list does not require a -g flag - the third argument is the release group. Rather than add custom handling for
	// that, we just add mappings for all three.
	"flub list": FlubListTask,
	"flub list build-tools": FlubListTask,
	"flub list client": FlubListTask,
	"flub list server": FlubListTask,
	"flub list gitrest": FlubListTask,
	"flub list historian": FlubListTask,

	// Common declarative tasks (based on FluidFramework patterns)
	"oclif manifest": OclifManifestTask,
	"oclif readme": OclifReadmeTask,
	"syncpack lint-semver-ranges": SyncpackLintSemverRangesTask,
	"syncpack list-mismatches": SyncpackListMismatchesTask,
	"markdown-magic": MarkdownMagicTask,
	"jssm-viz": JssmVizTask,
} as const;

/**
 * Given a command executable, attempts to find a matching `TaskHandler` that will handle the task. If one is found, it
 * is returned; otherwise, it returns `UnknownLeafTask` as the default handler.
 *
 * Handler resolution follows this priority order:
 * 1. DeclarativeTasks defined in package.json (sail.declarativeTasks or fluidBuild.declarativeTasks)
 * 2. DeclarativeTasks defined in Sail config
 * 3. Custom handlers from the TaskHandlerRegistry (loaded from config or registered programmatically)
 * 4. Built-in handlers (executableToLeafTask constant)
 * 5. UnknownLeafTask (fallback for unsupported executables)
 *
 * @param executable The command executable to find a matching task handler for.
 * @returns A `TaskHandler` for the task, if found. Otherwise `UnknownLeafTask` as the default handler.
 */
function getTaskForExecutable(
	executable: string,
	{ pkg: { packageJson } }: BuildGraphPackage,
	context: BuildContext,
): TaskHandler {
	const config = context.sailConfig;
	const declarativeTasks = config?.declarativeTasks;

	// 1. Check for declarative tasks first (highest priority)
	const taskMatch =
		packageJson.sail?.declarativeTasks?.[executable] ??
		packageJson.fluidBuild?.declarativeTasks?.[executable] ??
		declarativeTasks?.[executable];

	if (taskMatch !== undefined) {
		return createDeclarativeTaskHandler(taskMatch);
	}

	// 2. Check custom handlers registry (from config or programmatic registration)
	const customHandler = context.taskHandlerRegistry.get(executable);
	if (customHandler !== undefined) {
		return customHandler;
	}

	// 3. Check built-in handlers
	const builtInHandler: TaskHandler | undefined =
		executableToLeafTask[executable];

	// 4. If no handler is found, return the UnknownLeafTask as the default handler. The task won't support incremental
	// builds.
	return builtInHandler ?? UnknownLeafTask;
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

// biome-ignore lint/complexity/noStaticOnlyClass: factory class with static methods only
export class TaskFactory {
	public static Create(
		node: BuildGraphPackage,
		command: string,
		context: BuildContext,
		pendingInitDep: Task[],
		taskName?: string,
	) {
		// Split the "&&" first
		const subTasks: Task[] = [];
		const steps = command.split("&&");
		if (steps.length > 1) {
			for (const step of steps) {
				subTasks.push(
					TaskFactory.Create(node, step.trim(), context, pendingInitDep),
				);
			}
			// create a sequential group task
			return new GroupTask(node, command, context, subTasks, taskName, true);
		}

		// Parse concurrently
		const concurrently = command.startsWith("concurrently ");
		if (concurrently) {
			// biome-ignore lint/nursery/noShadow: local subTasks variable intentionally shadows outer scope for concurrent command parsing
			const subTasks: Task[] = [];
			// biome-ignore lint/nursery/noShadow: local steps variable intentionally shadows outer scope for concurrent command parsing
			const steps = command
				.substring("concurrently ".length)
				.split(regexSpaceSplit);
			for (const step of steps) {
				const npmMatch = regexNpmConcurrentlySpec.exec(step);
				if (npmMatch?.groups !== undefined) {
					const scriptSpec = npmMatch.groups.script;
					let scriptNames: string[];
					// When npm:... ends with *, it is a wildcard match of all scripts that start with the prefix.
					if (npmMatch.groups.wildcard === "*") {
						// Note: result of no matches is allowed, so long as another concurrently step has a match.
						// This avoids general tool being overly prescriptive about script patterns. If always
						// having a match is desired, then such a policy should be enforced.
						scriptNames = Object.keys(node.pkg.packageJson.scripts).filter(
							(s) => s.startsWith(scriptSpec),
						);
					} else {
						scriptNames = [scriptSpec];
					}
					for (const scriptName of scriptNames) {
						const task = node.getScriptTask(scriptName, pendingInitDep);
						if (task === undefined) {
							throw new Error(
								`${
									node.pkg.nameColored
								}: Unable to find script '${scriptName}' listed in 'concurrently' command${
									taskName ? ` '${taskName}'` : ""
								}`,
							);
						}
						subTasks.push(task);
					}
				} else {
					subTasks.push(
						TaskFactory.Create(node, step, context, pendingInitDep),
					);
				}
			}
			if (subTasks.length === 0) {
				throw new Error(
					`${node.pkg.nameColored}: Unable to find any tasks listed in 'concurrently' command${
						taskName ? ` '${taskName}'` : ""
					}`,
				);
			}
			return new GroupTask(node, command, context, subTasks, taskName);
		}

		// Resolve "npm run" to the actual script
		if (command.startsWith("npm run ")) {
			const scriptName = command.substring("npm run ".length);
			const subTask = node.getScriptTask(scriptName, pendingInitDep);
			if (subTask === undefined) {
				throw new Error(
					`${node.pkg.nameColored}: Unable to find script '${scriptName}' in 'npm run' command`,
				);
			}
			// Even though there is only one task, create a group task for the taskName
			return new GroupTask(node, command, context, [subTask], taskName);
		}

		// Leaf tasks; map the executable to a known task type. If none is found, the UnknownLeafTask is used.
		const executable = getExecutableFromCommand(
			command,
			context.sailConfig?.multiCommandExecutables ?? [],
		).toLowerCase();

		// Will return a task-specific handler or the UnknownLeafTask
		const handler = getTaskForExecutable(executable, node, context);

		// Invoke the function or constructor to create the task handler
		if (isConstructorFunction(handler)) {
			return new handler(node, command, context, taskName);
		}
		return handler(node, command, context, taskName);
	}

	/**
	 * Create a target task that only have dependencies but no action.
	 * The dependencies will be initialized using the target name and the task definition for the package
	 * @param node build package for the target task
	 * @param taskName target name
	 * @returns the target task
	 */
	public static CreateTargetTask(
		node: BuildGraphPackage,
		context: BuildContext,
		taskName: string | undefined,
	) {
		return new GroupTask(node, `sail b -t ${taskName}`, context, [], taskName);
	}

	public static CreateTaskWithLifeCycle(
		node: BuildGraphPackage,
		context: BuildContext,
		scriptTask: Task,
		preScriptTask?: Task,
		postScriptTask?: Task,
	) {
		if (preScriptTask === undefined && postScriptTask === undefined) {
			return scriptTask;
		}
		const subTasks: Task[] = [];
		if (preScriptTask !== undefined) {
			subTasks.push(preScriptTask);
		}
		subTasks.push(scriptTask);
		if (postScriptTask !== undefined) {
			subTasks.push(postScriptTask);
		}
		return new GroupTask(
			node,
			`npm run ${scriptTask.taskName}`,
			context,
			subTasks,
			scriptTask.taskName,
			true,
		);
	}
}
