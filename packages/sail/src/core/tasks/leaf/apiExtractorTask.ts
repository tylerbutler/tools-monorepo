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
}
