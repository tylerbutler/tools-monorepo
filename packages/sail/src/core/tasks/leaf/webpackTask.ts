import fs from "node:fs";
import path from "node:path";

import { globFn, loadModule, toPosixPath } from "../taskUtils.js";
import { LeafWithDoneFileTask } from "./leafTask.js";

export class WebpackTask extends LeafWithDoneFileTask {
	protected override get taskWeight() {
		return 5; // generally expensive relative to other tasks
	}
	protected override async getDoneFileContent() {
		// We don't know all the input dependencies of webpack, Make sure recheckLeafIsUpToDate is false
		// so we will always execute if any of the dependencies not up-to-date at the beginning of the build
		// where their output might change the webpack's input.
		if (this.recheckLeafIsUpToDate !== false) {
			throw new Error("WebpackTask requires recheckLeafIsUpToDate to be false");
		}
		try {
			const config = await loadModule(
				this.configFileFullPaths[0],
				this.package.packageJson.type,
			);

			// Get base done file content (includes file hashes)
			const baseDoneFile = await super.getDoneFileContent();
			if (!baseDoneFile) {
				return undefined;
			}

			// Parse and augment with webpack-specific metadata
			const baseContent = JSON.parse(baseDoneFile);
			return JSON.stringify({
				version: await this.getVersion(),
				config:
					typeof config === "function"
						? config(this.getEnvArguments())
						: config,
				...baseContent,
			});
		} catch (e) {
			this.traceError(`error generating done file content ${e}`);
			return undefined;
		}
	}

	protected override get configFileFullPaths() {
		// TODO: parse the command line for real, split space for now.
		const args = this.command.split(" ");
		for (let i = 1; i < args.length; i++) {
			if (args[i] === "--config" && i + 1 < args.length) {
				return [path.join(this.package.directory, args[i + 1])];
			}
		}

		return [this.getDefaultConfigFile()];
	}

	private getDefaultConfigFile() {
		const defaultConfigFileNames = [
			"webpack.config",
			".webpack/webpack.config",
			".webpack/webpackfile",
		];
		// TODO: webpack support more default config file extensions.  Just implement the ones that we use.
		const defaultConfigExtensions = [".js", ".cjs"];
		for (const name of defaultConfigFileNames) {
			for (const ext of defaultConfigExtensions) {
				const file = path.join(this.package.directory, `${name}${ext}`);
				if (fs.existsSync(file)) {
					return file;
				}
			}
		}
		// return webpack.config.cjs if nothing exist
		return path.join(this.package.directory, "webpack.config.cjs");
	}

	private getEnvArguments() {
		// TODO: parse the command line for real, split space for now.
		const args = this.command.split(" ");
		const env: Record<string, string | boolean> = {};
		// Ignore trailing --env
		for (let i = 1; i < args.length - 1; i++) {
			if (args[i] === "--env") {
				const value = args[++i].split("=");
				env[value[0]] = value.length === 1 ? true : value[1];
			}
		}
	}

	private async getVersion() {
		// TODO:  We can get webpack version with "webpack --version", but harder to get the plug-ins
		// For now we just use the big hammer of the monorepo lock file as are guard against version change
		return this.node.getLockFileHash();
	}

	protected async getInputFiles(): Promise<string[]> {
		// Include all source files in src directory
		// TODO: this is specific to the microsoft/FluidFramework repo set up.
		const srcGlob = `${toPosixPath(this.node.pkg.directory)}/src/**/*.*`;
		try {
			return await globFn(srcGlob);
		} catch (error) {
			this.traceError(`Failed to glob source files for webpack: ${error}`);
			return [];
		}
	}

	protected async getOutputFiles(): Promise<string[]> {
		// WebpackTask doesn't track output files separately (outputs vary by config)
		return [];
	}
}
