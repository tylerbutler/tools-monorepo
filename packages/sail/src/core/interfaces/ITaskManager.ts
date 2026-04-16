import type { Task } from "../tasks/task.js";

/**
 * Task manager interface for handling task creation and lifecycle management
 */
export interface ITaskManager {
	/**
	 * Gets the current number of tasks
	 */
	get taskCount(): number;

	/**
	 * Gets read-only access to the tasks map
	 */
	get tasksMap(): ReadonlyMap<string, Task>;

	/**
	 * Gets read-only access to the script tasks map
	 */
	get scriptTasksMap(): ReadonlyMap<string, Task>;

	/**
	 * Creates tasks for the given task names and initializes their dependencies
	 */
	createTasks(buildTaskNames: string[]): boolean | undefined;

	/**
	 * Gets or creates a task by name
	 */
	getTask(
		taskName: string,
		pendingInitDep: Task[] | undefined,
	): Task | undefined;

	/**
	 * Gets or creates a script task by name
	 */
	getScriptTask(taskName: string, pendingInitDep: Task[]): Task | undefined;

	/**
	 * Gets dependent tasks for a given task
	 */
	getDependsOnTasks(task: Task, taskName: string, pendingInitDep: Task[]): void;

	/**
	 * Finalizes dependent tasks
	 */
	finalizeDependentTasks(): void;
}
