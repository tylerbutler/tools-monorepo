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
		// Get done file, TypeScript inputs, and config files from parent class
		// (config files are now automatically included via configFileFullPaths property)
		const inputs = await super.getCacheInputFiles();

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
}
