import { Args, Flags } from "@oclif/core";
import { logIndent } from "@tylerbu/cli-api";
import {
	getAllDependencies,
	type IBuildProject,
	loadBuildProject,
} from "@tylerbu/sail-infrastructure";
import colors from "picocolors";
import { BaseSailCommand } from "../baseCommand.js";
import type { BuildPackage } from "../common/npmPackage.js";

export default class BuildCommand extends BaseSailCommand<typeof BuildCommand> {
	public static override readonly description =
		"Scan a path to see it the way Sail sees it.";

	public static override readonly args = {
		scan_dir: Args.directory({
			description: "Directory to scan.",
			default: ".",
			required: false,
		}),
	};

	public static override readonly flags = {
		infer: Flags.boolean({
			allowNo: false,
			default: false,
			description:
				"Skip loading configuration from files. Instead the configuration will be inferred.",
		}),
		...BaseSailCommand.flags,
	} as const;

	public async run(): Promise<void> {
		const { args, flags } = this;
		const scanDir = args.scan_dir;

		// const {buildProject: bpjConfig} = this.commandConfig;
		const buildProject = loadBuildProject<BuildPackage>(scanDir, flags.infer);

		this.log(`BuildProject.root: ${buildProject.root}`);
		this.log(
			`BuildProject.configSource: ${buildProject.configurationSource}\n`,
		);

		if (this.flags.verbose) {
			await this.logFullReport(buildProject);
		} else {
			await this.logCompactReport(buildProject);
		}
	}

	private async logFullReport(repo: IBuildProject): Promise<void> {
		this.log(colors.underline("Build project layout"));
		for (const workspace of repo.workspaces.values()) {
			logIndent(
				`${colors.blue(workspace.toString())}: ${workspace.directory}`,
				this,
				1,
			);
			for (const releaseGroup of workspace.releaseGroups.values()) {
				this.log();
				logIndent(colors.green(releaseGroup.toString()), this, 1);
				logIndent(colors.bold("Packages"), this, 3);
				for (const pkg of releaseGroup.packages) {
					const pkgMessage = colors.white(
						`${pkg.name}${pkg.isReleaseGroupRoot ? colors.bold(" (root)") : ""}`,
					);
					logIndent(pkgMessage, this, 4);
				}

				const { releaseGroups, workspaces } = getAllDependencies(
					repo,
					releaseGroup.packages,
				);
				if (releaseGroups.length > 0 || workspaces.length > 0) {
					this.log();
					logIndent(colors.bold("Depends on:"), this, 3);
					for (const depReleaseGroup of releaseGroups) {
						logIndent(depReleaseGroup.toString(), this, 4);
					}
					for (const depWorkspace of workspaces) {
						logIndent(depWorkspace.toString(), this, 4);
					}
				}
			}
		}
	}

	private async logCompactReport(repo: IBuildProject): Promise<void> {
		this.log(colors.underline("Repository layout"));
		for (const workspace of repo.workspaces.values()) {
			logIndent(
				`${colors.blue(workspace.toString())}: ${workspace.directory}`,
				this,
				1,
			);
			logIndent(colors.bold("Packages"), this, 2);
			for (const pkg of workspace.packages.slice(0, 20)) {
				const pkgMessage = colors.white(
					`${pkg.isReleaseGroupRoot ? colors.bold("(root) ") : ""}${pkg.name} ${colors.black(colors.bgGreen(pkg.releaseGroup))}`,
				);
				logIndent(pkgMessage, this, 3);
			}
			if (workspace.packages.length > 20) {
				logIndent(
					colors.white(
						colors.bold(
							`...and ${workspace.packages.length - 20} more packages.`,
						),
					),
					this,
				);
			}
		}
	}
}
