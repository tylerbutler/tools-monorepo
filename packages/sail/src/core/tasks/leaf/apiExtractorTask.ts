import {
	getApiExtractorConfigFilePath,
	getInstalledPackageVersion,
} from "../taskUtils.js";
import { TscDependentTask } from "./tscTask.js";

export class ApiExtractorTask extends TscDependentTask {
	protected get configFileFullPaths() {
		// TODO: read all configs used by command via api-extractor simple extension pattern
		return [
			this.getPackageFileFullPath(getApiExtractorConfigFilePath(this.command)),
		];
	}

	protected async getToolVersion() {
		return getInstalledPackageVersion(
			"@microsoft/api-extractor",
			this.node.pkg.directory,
		);
	}

	public override async getCacheInputFiles(): Promise<string[]> {
		// Get done file and TypeScript inputs from parent class
		const inputs = await super.getCacheInputFiles();

		// Include the api-extractor config file
		const configPaths = this.configFileFullPaths;
		inputs.push(...configPaths);

		// API Extractor processes .d.ts files generated from src
		// Include all source files in src directory
		const { globFn, toPosixPath } = await import("../taskUtils.js");
		const srcGlob = `${toPosixPath(this.node.pkg.directory)}/src/**/*.*`;
		try {
			const srcFiles = await globFn(srcGlob);
			inputs.push(...srcFiles);
		} catch (error) {
			this.traceError(
				`Failed to glob source files for api-extractor: ${error}`,
			);
		}

		return inputs;
	}

	public override async getCacheOutputFiles(): Promise<string[]> {
		// Get done file and TypeScript outputs from parent class
		const outputs = await super.getCacheOutputFiles();

		// API Extractor outputs depend on config (docModel, apiReport, dtsRollup, etc.)
		// To get accurate outputs, we would need to parse the config file
		// For now, rely on the done file mechanism
		// Future enhancement: parse config to get output paths

		return outputs;
	}
}
