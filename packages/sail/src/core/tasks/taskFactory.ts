import { getExecutableFromCommand } from "../../common/utils.js";
import type { BuildContext } from "../buildContext.js";
import type { BuildGraphPackage } from "../buildGraph.js";
import { GroupTask } from "./groupTask.js";
import { ApiExtractorTask } from "./leaf/apiExtractorTask.js";
import { BiomeTask } from "./leaf/biomeTasks.js";
import { createDeclarativeTaskHandler } from "./leaf/declarativeTask.js";
import {
	FlubCheckLayerTask,
	FlubCheckPolicyTask,
	FlubGenerateChangesetConfigTask,
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
import { type TaskHandler, isConstructorFunction } from "./taskHandlers.js";

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
} as const;

/**
 * Given a command executable, attempts to find a matching `TaskHandler` that will handle the task. If one is found, it
 * is returned; otherwise, it returns `UnknownLeafTask` as the default handler.
 *
 * Any DeclarativeTasks that are defined in the Sail config are checked first, followed by the built-in
 * executableToLeafTask constant.
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
	const taskMatch =
		packageJson.sail?.declarativeTasks?.[executable] ??
		packageJson.fluidBuild?.declarativeTasks?.[executable] ??
		declarativeTasks?.[executable];

	if (taskMatch !== undefined) {
		return createDeclarativeTaskHandler(taskMatch);
	}

	// No declarative task found matching the executable, so look it up in the built-in list.
	const builtInHandler: TaskHandler | undefined =
		executableToLeafTask[executable];

	// If no handler is found, return the UnknownLeafTask as the default handler. The task won't support incremental
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

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class TaskFactory {
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
	public static Create(
		node: BuildGraphPackage,
		command: string,
		context: BuildContext,
		pendingInitDep: Task[],
		taskName?: string,
	) {
		// Split the "&&" first
		const subTasks = new Array<Task>();
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
			const subTasks = new Array<Task>();
			const steps = command.substring("concurrently ".length).split(/ +/);
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
