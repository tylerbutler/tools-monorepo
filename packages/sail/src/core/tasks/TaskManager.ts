import registerDebug from "debug";
import type { BuildPackage } from "../../common/npmPackage.js";
import type { BuildContext } from "../buildContext.js";
import type { BuildGraphPackage } from "../buildGraph.js";
import type { TaskDefinition } from "../taskDefinitions.js";
import type { Task } from "./task.js";
import { TaskFactory } from "./taskFactory.js";

const traceTaskDepTask = registerDebug("sail:task:init:dep:task");

/**
 * TaskManager handles task creation, lifecycle management, and dependency resolution
 * for a single package in the build graph.
 */
export class TaskManager {
	private readonly tasks = new Map<string, Task>();

	// track a script task without the lifecycle (pre/post) tasks
	private readonly scriptTasks = new Map<string, Task>();

	public constructor(
		private readonly pkg: BuildPackage,
		private readonly context: BuildContext,
		private readonly getTaskDefinition: (
			taskName: string,
		) => TaskDefinition | undefined,
		private readonly dependentPackages: BuildGraphPackage[],
		private readonly buildGraphPackage: BuildGraphPackage,
		private readonly getAllDefinedTaskNames?: () => string[],
	) {}

	/**
	 * Gets the current number of tasks
	 */
	public get taskCount(): number {
		return this.tasks.size;
	}

	/**
	 * Resets all tasks, clearing cached execution state.
	 * Call this before each build to ensure fresh task evaluation.
	 *
	 * Note: Primarily intended for use in tests where task instances are reused.
	 * In production, each build creates new task instances, so reset is not needed.
	 */
	public resetAllTasks(): void {
		for (const task of this.tasks.values()) {
			task.reset();
		}
		for (const task of this.scriptTasks.values()) {
			task.reset();
		}
	}

	/**
	 * Gets read-only access to the tasks map
	 */
	public get tasksMap(): ReadonlyMap<string, Task> {
		return this.tasks;
	}

	/**
	 * Gets read-only access to the script tasks map
	 */
	public get scriptTasksMap(): ReadonlyMap<string, Task> {
		return this.scriptTasks;
	}

	/**
	 * Creates tasks for the given task names and initializes their dependencies.
	 * Also proactively creates tasks with before/after relationships to the requested tasks.
	 */
	public createTasks(buildTaskNames: string[]): boolean | undefined {
		const taskNames = buildTaskNames;
		if (taskNames.length === 0) {
			return undefined;
		}

		const pendingInitDep: Task[] = [];
		const tasks = taskNames
			.map((value) => this.getTask(value, pendingInitDep))
			.filter((task) => task !== undefined);

		// Proactively create tasks with before/after relationships to the created tasks
		if (this.getAllDefinedTaskNames) {
			const allDefinedNames = this.getAllDefinedTaskNames();
			const createdTaskNames = new Set(this.tasks.keys());

			for (const candidateName of allDefinedNames) {
				// Skip if task already created
				if (createdTaskNames.has(candidateName)) {
					continue;
				}

				const definition = this.getTaskDefinition(candidateName);
				if (!definition) {
					continue;
				}

				// Check if this task has before/after relationships with any created task
				const hasBeforeRelationship = definition.before.some((targetName) => {
					// Handle wildcard "*" - refers to all created tasks
					if (targetName === "*") {
						return createdTaskNames.size > 0;
					}
					// Only check local task names (no ^ or # prefixes for before/after)
					return createdTaskNames.has(targetName);
				});

				const hasAfterRelationship = definition.after.some((targetName) => {
					if (targetName === "*") {
						return createdTaskNames.size > 0;
					}
					return createdTaskNames.has(targetName);
				});

				// If this task references any created task, create it
				if (hasBeforeRelationship || hasAfterRelationship) {
					const task = this.getTask(candidateName, pendingInitDep);
					if (task) {
						createdTaskNames.add(candidateName);
					}
				}
			}
		}

		while (pendingInitDep.length > 0) {
			// biome-ignore lint/style/noNonNullAssertion: loop condition ensures array is non-empty
			const task = pendingInitDep.pop()!;
			task.initializeDependentTasks(pendingInitDep);
		}

		return tasks.length > 0;
	}

	/**
	 * Creates a task based on its configuration (target task or script task)
	 */
	private createTask(
		taskName: string,
		pendingInitDep: Task[],
	): Task | undefined {
		const config = this.getTaskDefinition(taskName);
		if (config?.script === false) {
			const task = TaskFactory.CreateTargetTask(
				this.buildGraphPackage,
				this.context,
				taskName,
			);
			pendingInitDep.push(task);
			return task;
		}
		return this.createScriptTask(taskName, pendingInitDep);
	}

	/**
	 * Creates a script task with lifecycle support (pre/post tasks)
	 */
	private createScriptTask(
		taskName: string,
		pendingInitDep: Task[],
	): Task | undefined {
		const command = this.pkg.getScript(taskName);
		if (command !== undefined && !this.isKnownMainExecutable(command)) {
			// Find the script task (without the lifecycle task)
			let scriptTask = this.scriptTasks.get(taskName);
			if (scriptTask === undefined) {
				scriptTask = TaskFactory.Create(
					this.buildGraphPackage,
					command,
					this.context,
					pendingInitDep,
					taskName,
				);
				pendingInitDep.push(scriptTask);
				this.scriptTasks.set(taskName, scriptTask);
			}

			// Create the script task with lifecycle task.
			// This will be tracked in the 'tasks' map, and other task that depends on this
			// script task will depend on this instance instead of the standalone script task without the lifecycle.
			const task = TaskFactory.CreateTaskWithLifeCycle(
				this.buildGraphPackage,
				this.context,
				scriptTask,
				this.ensureScriptTask(`pre${taskName}`, pendingInitDep),
				this.ensureScriptTask(`post${taskName}`, pendingInitDep),
			);
			if (task !== scriptTask) {
				// We are doing duplicate work initializeDependentTasks as both the lifecycle task
				// and script task will have the task name and dependency
				pendingInitDep.push(task);
			}
			return task;
		}
		return undefined;
	}

	/**
	 * Ensures a script task exists or creates it
	 */
	private ensureScriptTask(
		taskName: string,
		pendingInitDep: Task[],
	): Task | undefined {
		const scriptTask = this.scriptTasks.get(taskName);
		if (scriptTask !== undefined) {
			return scriptTask;
		}
		const command = this.pkg.getScript(taskName);
		if (command === undefined) {
			return undefined;
		}
		const config = this.getTaskDefinition(taskName);
		if (config?.script === false) {
			throw new Error(
				`${this.pkg.nameColored}: '${taskName}' must be a script task`,
			);
		}

		const task = TaskFactory.Create(
			this.buildGraphPackage,
			command,
			this.context,
			pendingInitDep,
			taskName,
		);
		pendingInitDep.push(task);
		this.scriptTasks.set(taskName, task);
		return task;
	}

	/**
	 * Create or return an existing task with a name. If it is a script, it will also create and return the pre/post script task if it exists
	 */
	public getTask(
		taskName: string,
		pendingInitDep: Task[] | undefined,
	): Task | undefined {
		const existing = this.tasks.get(taskName);
		if (existing) {
			return existing;
		}

		if (pendingInitDep === undefined) {
			// when pendingInitDep is undefined, it is a weak dependency, so don't instantiate the referenced task
			return undefined;
		}

		const task = this.createTask(taskName, pendingInitDep);
		if (task !== undefined) {
			this.tasks.set(taskName, task);
		}
		return task;
	}

	/**
	 * Gets a script task (not a target task)
	 */
	public getScriptTask(
		taskName: string,
		pendingInitDep: Task[],
	): Task | undefined {
		const config = this.getTaskDefinition(taskName);
		if (config?.script === false) {
			// it is not a script task
			return undefined;
		}
		const existing = this.tasks.get(taskName);
		if (existing) {
			return existing;
		}

		const task = this.createScriptTask(taskName, pendingInitDep);
		if (task !== undefined) {
			this.tasks.set(taskName, task);
		}
		return task;
	}

	/**
	 * Gets tasks that this task depends on
	 */
	public getDependsOnTasks(
		_task: Task,
		taskName: string,
		pendingInitDep: Task[],
	): Task[] {
		const taskDefinition = this.getTaskDefinition(taskName);
		if (!taskDefinition) {
			return [];
		}

		const dependsOnTasks = this.getMatchedTasks(
			taskDefinition.dependsOn,
			pendingInitDep,
		);
		traceTaskDepTask(
			`${this.pkg.nameColored}:${taskName} depends on ${dependsOnTasks.length} tasks`,
		);
		return dependsOnTasks;
	}

	/**
	 * Resolves task dependencies based on dependency patterns
	 */
	public getMatchedTasks(
		deps: readonly string[],
		pendingInitDep?: Task[],
	): Task[] {
		const ret: Task[] = [];
		for (const dep of deps) {
			if (dep.startsWith("^")) {
				// dependent package task
				const depTaskName = dep.substring(1);
				for (const depPackage of this.dependentPackages) {
					// Use the task manager from the dependent package
					const depTask = depPackage.taskManager?.getTask(
						depTaskName,
						pendingInitDep,
					);
					if (depTask) {
						ret.push(depTask);
					}
				}
			} else if (dep.includes("#")) {
				// specific package task
				const split = dep.split("#");
				if (split.length === 2) {
					const [packageName, taskName] = split;
					const depPackage = this.dependentPackages.find(
						(pkg) => pkg.pkg.name === packageName,
					);
					if (depPackage) {
						// Use the task manager from the specific dependent package
						const depTask = depPackage.taskManager?.getTask(
							taskName,
							pendingInitDep,
						);
						if (depTask) {
							ret.push(depTask);
						}
					}
				}
			} else {
				// local task dependency
				const depTask = this.getTask(dep, pendingInitDep);
				if (depTask) {
					ret.push(depTask);
				}
			}
		}
		return ret;
	}

	/**
	 * Finalizes dependent tasks by setting up before/after dependencies
	 */
	public finalizeDependentTasks(): void {
		// Get the beforeStar and afterStar tasks name on demand
		let beforeStarTaskNames: string[] | undefined;
		const getBeforeStarTaskNames = () => {
			if (beforeStarTaskNames !== undefined) {
				return beforeStarTaskNames;
			}
			// avoid circular dependency. ignore mutual before "*" */
			beforeStarTaskNames = Array.from(this.tasks.keys()).filter(
				(depTaskName) =>
					!this.getTaskDefinition(depTaskName)?.before.includes("*"),
			);
			return beforeStarTaskNames;
		};

		let afterStarTaskNames: string[] | undefined;
		const getAfterStarTaskNames = () => {
			if (afterStarTaskNames !== undefined) {
				return afterStarTaskNames;
			}
			// avoid circular dependency. ignore mutual after "*" */
			afterStarTaskNames = Array.from(this.tasks.keys()).filter(
				(depTaskName) =>
					!this.getTaskDefinition(depTaskName)?.after.includes("*"),
			);
			return afterStarTaskNames;
		};

		// Expand the star entry to all scheduled tasks
		const expandStar = (
			deps: readonly string[],
			getTaskNames: () => string[],
		) => {
			const newDeps = deps.filter((dep) => dep !== "*");
			if (newDeps.length === deps.length) {
				return newDeps;
			}
			return newDeps.concat(getTaskNames());
		};

		const finalizeTask = (task: Task) => {
			if (!task.taskName) {
				return;
			}

			const taskConfig = this.getTaskDefinition(task.taskName);
			if (taskConfig === undefined) {
				return;
			}

			if (taskConfig.before.length > 0) {
				// We don't want parent packages to inject dependencies to the child packages,
				// so ^ and # are not supported for 'before'
				const before = expandStar(taskConfig.before, getBeforeStarTaskNames);
				const matchedTasks = this.getMatchedTasks(before);
				const dependentTask = [task];
				for (const matchedTask of matchedTasks) {
					matchedTask.addDependentTasks(dependentTask, taskConfig.isDefault);
				}
			}

			if (taskConfig.after.length > 0) {
				const after = expandStar(taskConfig.after, getAfterStarTaskNames);
				const matchedTasks = this.getMatchedTasks(after);
				task.addDependentTasks(matchedTasks, taskConfig.isDefault);
			}
		};

		this.tasks.forEach(finalizeTask);
		this.scriptTasks.forEach((task: Task, name: string) => {
			// Process named script task that hasn't been processed yet.
			if (this.tasks.get(name) !== task) {
				finalizeTask(task);
			}
		});
	}

	/**
	 * Helper method to check if a command is a known main executable
	 */
	private isKnownMainExecutable(script: string): boolean {
		const knownMainExecutableNames = new Set([
			"sail build",
			"sail b",
			"fluid-build",
		]);

		return [...knownMainExecutableNames].some((name) =>
			script.startsWith(`${name} `),
		);
	}
}
