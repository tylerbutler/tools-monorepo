/*!
 * Common declarative task implementations based on patterns from FluidFramework and other popular monorepos.
 * These tasks are automatically available without requiring declarativeTask configuration.
 */

import path from "node:path";
import { globFn } from "../taskUtils.js";
import { LeafWithFileStatDoneFileTask } from "./leafTask.js";

/**
 * Task for `oclif manifest` command.
 * Generates oclif manifest file from package.json and source files.
 */
export class OclifManifestTask extends LeafWithFileStatDoneFileTask {
	protected async getInputFiles(): Promise<string[]> {
		const pkgDir = this.node.pkg.directory;
		const inputs = [path.join(pkgDir, "package.json")];

		// Include all source files
		const srcFiles = await globFn(path.join(pkgDir, "src/**"), { nodir: true });
		inputs.push(...srcFiles);

		return inputs;
	}

	protected async getOutputFiles(): Promise<string[]> {
		const pkgDir = this.node.pkg.directory;
		return [path.join(pkgDir, "oclif.manifest.json")];
	}
}

/**
 * Task for `oclif readme` command.
 * Generates README and docs from package.json and source files.
 */
export class OclifReadmeTask extends LeafWithFileStatDoneFileTask {
	protected async getInputFiles(): Promise<string[]> {
		const pkgDir = this.node.pkg.directory;
		const inputs = [path.join(pkgDir, "package.json")];

		// Include all source files
		const srcFiles = await globFn(path.join(pkgDir, "src/**"), { nodir: true });
		inputs.push(...srcFiles);

		return inputs;
	}

	protected async getOutputFiles(): Promise<string[]> {
		const pkgDir = this.node.pkg.directory;
		const outputs = [path.join(pkgDir, "README.md")];

		// Include docs directory if it exists
		const docsFiles = await globFn(path.join(pkgDir, "docs/**"), {
			nodir: true,
		});
		outputs.push(...docsFiles);

		return outputs;
	}
}

/**
 * Task for `syncpack lint-semver-ranges` command.
 * Checks package.json files for consistent semver ranges.
 */
export class SyncpackLintSemverRangesTask extends LeafWithFileStatDoneFileTask {
	protected async getInputFiles(): Promise<string[]> {
		const pkgDir = this.node.pkg.directory;
		const inputs: string[] = [];

		// Include syncpack config if it exists
		const configPatterns = [
			"syncpack.config.cjs",
			"syncpack.config.js",
			".syncpackrc",
		];

		for (const pattern of configPatterns) {
			const configFiles = await globFn(path.join(pkgDir, pattern), {
				nodir: true,
			});
			inputs.push(...configFiles);
		}

		// Include all package.json files in workspace
		inputs.push(path.join(pkgDir, "package.json"));
		const workspacePackages = await globFn(
			path.join(pkgDir, "{packages,apps,tools}/*/*/package.json"),
			{ nodir: true },
		);
		inputs.push(...workspacePackages);

		return inputs;
	}

	protected async getOutputFiles(): Promise<string[]> {
		// Syncpack lint doesn't produce output files, just validates
		// But we return package.json files as they may be auto-fixed
		const pkgDir = this.node.pkg.directory;
		const outputs = [path.join(pkgDir, "package.json")];

		const workspacePackages = await globFn(
			path.join(pkgDir, "{packages,apps,tools}/*/*/package.json"),
			{ nodir: true },
		);
		outputs.push(...workspacePackages);

		return outputs;
	}
}

/**
 * Task for `syncpack list-mismatches` command.
 * Lists dependency version mismatches across workspace.
 */
export class SyncpackListMismatchesTask extends LeafWithFileStatDoneFileTask {
	protected async getInputFiles(): Promise<string[]> {
		const pkgDir = this.node.pkg.directory;
		const inputs: string[] = [];

		// Include syncpack config if it exists
		const configPatterns = [
			"syncpack.config.cjs",
			"syncpack.config.js",
			".syncpackrc",
		];

		for (const pattern of configPatterns) {
			const configFiles = await globFn(path.join(pkgDir, pattern), {
				nodir: true,
			});
			inputs.push(...configFiles);
		}

		// Include all package.json files in workspace
		inputs.push(path.join(pkgDir, "package.json"));
		const workspacePackages = await globFn(
			path.join(pkgDir, "{packages,apps,tools}/*/*/package.json"),
			{ nodir: true },
		);
		inputs.push(...workspacePackages);

		return inputs;
	}

	protected async getOutputFiles(): Promise<string[]> {
		// List command doesn't modify files
		return [];
	}
}

/**
 * Task for `markdown-magic` command.
 * Processes markdown files with dynamic content injection.
 */
export class MarkdownMagicTask extends LeafWithFileStatDoneFileTask {
	protected async getInputFiles(): Promise<string[]> {
		// Markdown-magic typically has no input files (or they're in config)
		// The tool finds markdown files to process
		return [];
	}

	protected async getOutputFiles(): Promise<string[]> {
		const pkgDir = this.node.pkg.directory;
		// Common patterns for markdown files in workspace
		const markdownFiles = await globFn(
			path.join(pkgDir, "{packages,tools}/*/**.md"),
			{ nodir: true },
		);
		return markdownFiles;
	}
}

/**
 * Task for `jssm-viz` command.
 * Generates SVG visualizations from .fsl state machine files.
 */
export class JssmVizTask extends LeafWithFileStatDoneFileTask {
	protected async getInputFiles(): Promise<string[]> {
		const pkgDir = this.node.pkg.directory;
		const fslFiles = await globFn(path.join(pkgDir, "src/**/*.fsl"), {
			nodir: true,
		});
		return fslFiles;
	}

	protected async getOutputFiles(): Promise<string[]> {
		const pkgDir = this.node.pkg.directory;
		const svgFiles = await globFn(path.join(pkgDir, "src/**/*.fsl.svg"), {
			nodir: true,
		});
		return svgFiles;
	}
}
