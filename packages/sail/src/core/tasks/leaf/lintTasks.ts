import {
	getEsLintConfigFilePath,
	getInstalledPackageVersion,
} from "../taskUtils.js";
import { TscDependentTask } from "./tscTask.js";

export class EsLintTask extends TscDependentTask {
	private _configFileFullPath: string | undefined;
	protected get configFileFullPaths() {
		if (!this._configFileFullPath) {
			this._configFileFullPath = getEsLintConfigFilePath(
				this.package.directory,
			);
			if (!this._configFileFullPath) {
				throw new Error(
					`Unable to find config file for eslint ${this.command}`,
				);
			}
		}
		return [this._configFileFullPath];
	}

	protected override get useWorker() {
		if (this.command === "eslint --format stylish src") {
			// eslint can't use worker thread as it needs to change the current working directory
			return this.node.workerPool?.useWorkerThreads === false;
		}
		return false;
	}

	protected async getToolVersion() {
		return getInstalledPackageVersion("eslint", this.node.pkg.directory);
	}

	public override async getCacheInputFiles(): Promise<string[]> {
		// Get done file and TypeScript inputs from parent class
		const inputs = await super.getCacheInputFiles();

		// Include the ESLint config file
		inputs.push(...this.configFileFullPaths);

		// ESLint lints source files in src directory
		// Include all source files
		const { globFn, toPosixPath } = await import("../taskUtils.js");
		const srcGlob = `${toPosixPath(this.node.pkg.directory)}/src/**/*.*`;
		try {
			const srcFiles = await globFn(srcGlob);
			inputs.push(...srcFiles);
		} catch (error) {
			this.traceError(`Failed to glob source files for eslint: ${error}`);
		}

		return inputs;
	}

	public override async getCacheOutputFiles(): Promise<string[]> {
		// Get done file and TypeScript outputs from parent class
		const outputs = await super.getCacheOutputFiles();

		// ESLint doesn't produce output files in the traditional sense
		// It produces reports/logs, but these are typically not cached
		// Rely on exit code and done file mechanism

		return outputs;
	}
}
