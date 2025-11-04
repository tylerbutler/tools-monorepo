import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { GitRepo } from "../../../common/gitRepo.js";
import { getSailConfig } from "../../../core/config.js";
import { sha256 } from "../../hash.js";
import {
	LeafWithDoneFileTask,
	LeafWithFileStatDoneFileTask,
} from "./leafTask.js";

export class FlubListTask extends LeafWithDoneFileTask {
	private getReleaseGroup() {
		const split = this.command.split(" ");
		for (let i = 0; i < split.length; i++) {
			const arg = split[i];
			if (arg === "-g" || arg === "--releaseGroup") {
				return split[i + 1];
			}
		}

		// no release group flag, so assume the third argument is the release group.
		return split.length < 3 || split[2].startsWith("-") ? undefined : split[2];
	}

	protected async getDoneFileContent(): Promise<string | undefined> {
		const resourceGroup = this.getReleaseGroup();
		if (resourceGroup === undefined) {
			return undefined;
		}
		const packages = Array.from(this.node.repoPackageMap.values()).filter(
			(pkg) => pkg.releaseGroup === resourceGroup,
		);
		if (packages.length === 0) {
			return undefined;
		}
		return JSON.stringify(packages.map((pkg) => [pkg.name, pkg.packageJson]));
	}

	public override async getCacheInputFiles(): Promise<string[]> {
		// FlubListTask doesn't have specific input files to track
		// Return empty to rely on done file mechanism
		return [];
	}

	public override async getCacheOutputFiles(): Promise<string[]> {
		// FlubListTask doesn't produce output files, just console output
		return [];
	}
}

export class FlubCheckLayerTask extends LeafWithDoneFileTask {
	private async getLayerInfoFile() {
		const split = this.command.split(" ");
		const index = split.indexOf("--info");
		if (index < 0) {
			return undefined;
		}
		const infoFile = split[index + 1];
		if (infoFile === undefined) {
			return undefined;
		}
		const infoFilePath = path.join(this.node.pkg.directory, infoFile);
		return existsSync(infoFilePath) ? readFile(infoFilePath) : undefined;
	}

	protected async getDoneFileContent(): Promise<string | undefined> {
		const layerInfoFile = await this.getLayerInfoFile();
		return layerInfoFile
			? JSON.stringify({
					layerInfo: layerInfoFile,
					packageJson: Array.from(this.node.repoPackageMap.values()).map(
						(pkg) => pkg.packageJson,
					),
				})
			: undefined;
	}

	public override async getCacheInputFiles(): Promise<string[]> {
		return [];
	}

	public override async getCacheOutputFiles(): Promise<string[]> {
		return [];
	}
}

export class FlubCheckPolicyTask extends LeafWithDoneFileTask {
	protected async getDoneFileContent(): Promise<string | undefined> {
		// We are using the "commit" (for HEAD) as a summary of the state of unchanged files to speed this up.
		const gitRepo = new GitRepo(this.node.pkg.directory);

		// Cover all the changes (including adding and removing of files, regardless of their staged state) relative to HEAD.
		const diff = await gitRepo.exec("diff HEAD", "diff HEAD");
		const modificationHash = sha256(Buffer.from(diff));

		return JSON.stringify({
			commit: await gitRepo.getCurrentSha(),
			modifications: modificationHash,
		});
	}

	public override async getCacheInputFiles(): Promise<string[]> {
		return [];
	}

	public override async getCacheOutputFiles(): Promise<string[]> {
		return [];
	}
}

const changesetConfigPath = ".changeset/config.json";

/**
 * Task for `flub generate typetests` command.
 * This command generates type validation tests by comparing current package types with previous versions.
 *
 * Inputs:
 * - src/ directory (contains the source types being validated)
 * - package.json (contains typeValidation config and dependency versions)
 *
 * Outputs:
 * - src/test/types/validate*Previous.generated.ts (default output location)
 */
export class FlubGenerateTypeTestsTask extends LeafWithFileStatDoneFileTask {
	/**
	 * Parse command line arguments to extract output directory and file pattern.
	 * Defaults match the flub command defaults:
	 * - outDir: ./src/test/types
	 * - outFile: validate<PackageName>Previous.generated.ts
	 */
	private getOutputInfo(): { outDir: string; outFile: string } {
		const args = this.command.split(" ");
		let outDir = "./src/test/types";
		let outFile = "validate*Previous.generated.ts"; // Use glob pattern for any package name

		for (let i = 0; i < args.length; i++) {
			if (args[i] === "--outDir" && i + 1 < args.length) {
				outDir = args[i + 1];
			}
			if (args[i] === "--outFile" && i + 1 < args.length) {
				outFile = args[i + 1];
			}
		}

		return { outDir, outFile };
	}

	protected async getInputFiles(): Promise<string[]> {
		const pkgDir = this.node.pkg.directory;
		return [
			path.join(pkgDir, "package.json"),
			path.join(pkgDir, "src"), // Watch entire src directory for type changes
		];
	}

	protected async getOutputFiles(): Promise<string[]> {
		const pkgDir = this.node.pkg.directory;
		const { outDir, outFile } = this.getOutputInfo();
		const outputPath = path.join(pkgDir, outDir, outFile);
		return [outputPath];
	}

	public override async getCacheInputFiles(): Promise<string[]> {
		const inputs = await super.getCacheInputFiles();
		inputs.push(...(await this.getInputFiles()));
		return inputs;
	}

	public override async getCacheOutputFiles(): Promise<string[]> {
		const outputs = await super.getCacheOutputFiles();
		outputs.push(...(await this.getOutputFiles()));
		return outputs;
	}
}

export class FlubGenerateChangesetConfigTask extends LeafWithFileStatDoneFileTask {
	/**
	 * All of these paths are assumed to be relative to the Sail root - the directory in which the Sail config
	 * file is found.
	 */
	private readonly configFiles = [
		changesetConfigPath,
		"fluidBuild.config.cjs",
		"flub.config.cjs",
	];

	protected async getInputFiles(): Promise<string[]> {
		const { configFilePath } = getSailConfig(process.cwd());
		const configDir = path.dirname(configFilePath);
		const configPaths = this.configFiles.map((configPath) =>
			path.resolve(configDir, configPath),
		);
		return configPaths;
	}

	/**
	 * The only file that is output by this task is the changeset config.
	 */
	protected async getOutputFiles(): Promise<string[]> {
		const { configFilePath } = getSailConfig(process.cwd());
		const configDir = path.dirname(configFilePath);
		const configPath = path.resolve(configDir, changesetConfigPath);
		return [configPath];
	}

	public override async getCacheInputFiles(): Promise<string[]> {
		// Get done file from parent class
		const inputs = await super.getCacheInputFiles();
		// Add task-specific input files
		inputs.push(...(await this.getInputFiles()));
		return inputs;
	}

	public override async getCacheOutputFiles(): Promise<string[]> {
		// Get done file from parent class
		const outputs = await super.getCacheOutputFiles();
		// Add task-specific output files
		outputs.push(...(await this.getOutputFiles()));
		return outputs;
	}
}
