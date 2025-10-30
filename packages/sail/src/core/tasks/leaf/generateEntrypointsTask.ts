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
}
