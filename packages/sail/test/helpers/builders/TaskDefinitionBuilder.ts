import type {
	TaskConfig,
	TaskDependencies,
} from "../../../src/core/taskDefinitions.js";

/**
 * Fluent builder for creating TaskConfig objects for testing.
 *
 * Simplifies test setup by providing a clean API for task configuration.
 *
 * @example
 * ```typescript
 * const taskDef = new TaskDefinitionBuilder()
 *   .named("build")
 *   .dependingOn("^build", "clean")
 *   .runningBefore("test")
 *   .withScript(true)
 *   .build();
 * ```
 */
export class TaskDefinitionBuilder {
	private taskName = "test-task";
	private dependsOn: string[] = [];
	private before: string[] = [];
	private after: string[] = [];
	private children: string[] = [];
	private isScript = true;

	/**
	 * Set the task name (for reference only, not included in TaskConfig)
	 */
	named(name: string): this {
		this.taskName = name;
		return this;
	}

	/**
	 * Add dependencies that must complete before this task runs
	 * @param tasks - Task dependencies (supports "^task", "package#task", etc.)
	 */
	dependingOn(...tasks: string[]): this {
		this.dependsOn.push(...tasks);
		return this;
	}

	/**
	 * Add weak dependencies - tasks that should run before this task if they're scheduled
	 * @param tasks - Task dependencies (supports "^task", "*", etc.)
	 */
	runningBefore(...tasks: string[]): this {
		this.before.push(...tasks);
		return this;
	}

	/**
	 * Add weak dependencies - tasks that should run after this task if they're scheduled
	 * @param tasks - Task dependencies (supports "^task", "^*", etc.)
	 */
	runningAfter(...tasks: string[]): this {
		this.after.push(...tasks);
		return this;
	}

	/**
	 * Add child tasks that are included in this task
	 * @param tasks - Child task names
	 */
	public withChildren(...tasks: string[]): this {
		this.children.push(...tasks);
		return this;
	}

	/**
	 * Set whether this is a script task (looks for package.json script)
	 */
	public withScript(isScript: boolean): this {
		this.isScript = isScript;
		return this;
	}

	/**
	 * Mark as a group task (non-script task that only triggers dependencies)
	 */
	asGroupTask(): this {
		this.isScript = false;
		return this;
	}

	/**
	 * Get the task name (useful for creating task definition maps)
	 */
	getTaskName(): string {
		return this.taskName;
	}

	/**
	 * Build the TaskConfig object
	 */
	build(): TaskConfig {
		return {
			dependsOn: this.dependsOn as TaskDependencies,
			before: this.before as TaskDependencies,
			after: this.after as TaskDependencies,
			children: this.children,
			script: this.isScript,
		};
	}

	/**
	 * Build and return as a tuple [taskName, taskConfig] for easy map creation
	 */
	buildEntry(): [string, TaskConfig] {
		return [this.taskName, this.build()];
	}
}

/**
 * Helper function to create a task definition map from builders
 *
 * @example
 * ```typescript
 * const taskDefs = createTaskDefinitionMap(
 *   new TaskDefinitionBuilder().named("build").dependingOn("^build"),
 *   new TaskDefinitionBuilder().named("test").dependingOn("build"),
 *   new TaskDefinitionBuilder().named("lint").asGroupTask()
 * );
 * ```
 */
export function createTaskDefinitionMap(
	...builders: TaskDefinitionBuilder[]
): Record<string, TaskConfig> {
	const map: Record<string, TaskConfig> = {};
	for (const builder of builders) {
		const [name, config] = builder.buildEntry();
		map[name] = config;
	}
	return map;
}
