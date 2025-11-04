import { getInstalledPackageVersion } from "../taskUtils.js";
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

	public override async getCacheInputFiles(): Promise<string[]> {
		// Get done file and TypeScript inputs from parent class
		return super.getCacheInputFiles();
	}

	public override async getCacheOutputFiles(): Promise<string[]> {
		// Get done file and TypeScript outputs from parent class
		return super.getCacheOutputFiles();
	}
}
