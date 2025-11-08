import path from "node:path";
import {
	getInstalledPackageVersion,
	globFn,
	toPosixPath,
} from "../taskUtils.js";
import { TscDependentTask } from "./tscTask.js";

export class GenerateEntrypointsTask extends TscDependentTask {
	protected get configFileFullPaths() {
		// Add package.json, which tsc should also depend on, but currently doesn't.
		return [this.node.pkg.packageJsonFilePath];
	}

	protected async getToolVersion() {
		return getInstalledPackageVersion(
			"@fluid-tools/build-cli",
			this.node.pkg.directory,
		);
	}

	/**
	 * Parse the --outDir argument from the command.
	 * Defaults to undefined if not specified (flub will use its own defaults).
	 */
	private getOutputDir(): string | undefined {
		const args = this.command.split(" ");
		for (let i = 0; i < args.length; i++) {
			if (args[i] === "--outDir" && i + 1 < args.length) {
				return args[i + 1];
			}
		}
		return undefined;
	}

	public override async getCacheInputFiles(): Promise<string[]> {
		// Get done file and TypeScript inputs from parent class (includes src/**/*.ts)
		const inputs = await super.getCacheInputFiles();

		// Add package.json explicitly (contains exports configuration)
		inputs.push(this.node.pkg.packageJsonFilePath);

		return inputs;
	}

	public override async getCacheOutputFiles(): Promise<string[]> {
		// Get done file and TypeScript outputs from parent class
		const outputs = await super.getCacheOutputFiles();

		// Add generated entrypoint files from the output directory
		const outDir = this.getOutputDir();
		if (outDir) {
			const pkgDir = this.node.pkg.directory;
			// Generate entrypoints creates index.js, index.d.ts, and potentially other files
			// Use glob to find all generated files in the output directory
			const outputGlob = toPosixPath(path.join(pkgDir, outDir, "**/*"));
			try {
				const entrypointFiles = await globFn(outputGlob, { nodir: true });
				outputs.push(...entrypointFiles);
			} catch (error) {
				this.traceError(
					`Failed to glob entrypoint output files for caching: ${error}`,
				);
			}
		}

		return outputs;
	}
}
