import { require } from "../taskUtils.js";
import type { WorkerExecResult, WorkerMessage } from "./worker.js";

export async function lint(message: WorkerMessage): Promise<WorkerExecResult> {
	const oldArgv = process.argv;
	const oldCwd = process.cwd();
	try {
		// Load the eslint version that is in the cwd scope
		const eslintPath = require.resolve("eslint", { paths: [message.cwd] });
		const eslint = require(eslintPath);

		// TODO: better parsing, assume split delimited for now.
		const argv = message.command.split(" ");

		// Some rules look at process.argv directly and change behaviors
		// (e.g. eslint-plugin-react log some error to console only if format is not set)
		// So just overwrite our argv
		process.argv = [process.argv0, eslintPath, ...argv.slice(1)];
		process.chdir(message.cwd);

		// assume "eslint --format stylish src"
		const engine = new eslint.ESLint();
		const results = await engine.lintFiles("src");
		// biome-ignore lint/suspicious/noImplicitAnyLet: formatter type is dynamically loaded
		// biome-ignore lint/suspicious/noEvolvingTypes: formatter type changes after loadFormatter call
		let formatter;
		try {
			formatter = await engine.loadFormatter("stylish");
		} catch (_e: unknown) {
			return { code: 2 };
		}

		const output = await formatter.format(results);

		if (output) {
			// TODO: Review if formatted output needs to be logged or returned
		}
		let code = 0;
		for (const result of results) {
			code += result.errorCount;
		}
		return { code };
	} finally {
		process.argv = oldArgv;
		process.chdir(oldCwd);
	}
}
