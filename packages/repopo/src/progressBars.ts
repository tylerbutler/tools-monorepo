import {
	type AddOptions,
	MultiProgressBars,
	type UpdateOptions,
} from "multi-progress-bars";
import chalk from "picocolors";
import {
	type PolicyHandlerResult,
	type PolicyName,
	isPolicyFixResult,
} from "./policy.js";

export class ProgressBarManager extends MultiProgressBars {
	#files: Record<PolicyName, string[]> = {};
	#failed: Record<PolicyName, string[]> = {};
	#succeeded: Record<PolicyName, string[]> = {};

	#filesCount(name: PolicyName): number {
		return this.#files[name]?.length ?? 0;
	}

	#succeededCount(name: PolicyName): number {
		return this.#succeeded[name]?.length ?? 0;
	}

	#failedCount(name: PolicyName): number {
		return this.#failed[name]?.length ?? 0;
	}

	#completedCount(name: PolicyName): number {
		return this.#succeededCount(name) + this.#failedCount(name);
	}

	constructor(initMessage: string) {
		super({
			initMessage: ` ${initMessage} `,
			anchor: "top",
			// if true, continue to intercept console functions even when all the tasks are completed;
			persist: false,
			border: true,
			spinnerFPS: 60,
			progressWidth: 10,
		});
	}

	override addTask(name: string, { ...options }: AddOptions): void {
		super.addTask(name, { ...options });
		this.#files[name] = [];
		this.#failed[name] = [];
		this.#succeeded[name] = [];
	}

	override done(
		name: string,
		{
			...options
		}: Pick<UpdateOptions, "message" | "barTransformFn" | "nameTransformFn">,
	): void {
		super.done(name, {
			...options,
			barTransformFn: (n: string) =>
				this.#failedCount(name) > 0 ? chalk.yellow(n) : chalk.green(n),
		});
	}

	addFile(name: string, file: string): void {
		// biome-ignore lint/style/noNonNullAssertion: FIXME
		this.#files[name]!.push(file);
		// const [_, percentage] = this.getDisplayProperties(name);
		this.updateTask(name, {
			// message: `Adding ${file}`,
			message: this.#displayString(name),
		});
	}

	setFileResult(name: string, file: string, result: PolicyHandlerResult): void {
		const target =
			result === true || isPolicyFixResult(result)
				? this.#succeeded[name]
				: this.#failed[name];
		target?.push(file);
		this.updateTask(name, {
			// message: `Scanned ${file}`,
			message: this.#displayString(name),
			percentage: this.#percentage(name),
		});
	}

	#percentage(name: PolicyName): number {
		const total = this.#filesCount(name);
		const completed = this.#completedCount(name);
		return completed / total;
	}

	#displayString(name: PolicyName): string {
		const total = this.#filesCount(name);
		const completed = this.#completedCount(name);

		return `${completed}/${total} files`;
	}
}
