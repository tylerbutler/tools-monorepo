import { Args, Flags } from "@oclif/core";
import { BaseCommand, CommandWithConfig } from "@tylerbu/cli-api";
import { useGit } from "@tylerbu/cli-api/capabilities";
import chalk from "picocolors";
import stripAnsi from "strip-ansi";

export default class SquishCommand extends BaseCommand<typeof SquishCommand> {
	private gitCapability = useGit(this, { required: true });
	public static override readonly description =
		"Squash-merge a branch with another branch, and reset the source branch to the squash-merged HEAD. This process results in the branch containing a single commit on top of the target branch.";

	public static override readonly flags = {
		"dry-run": Flags.boolean({
			description: "Don't make any changes.",
		}),
		...CommandWithConfig.flags,
	};

	public static override readonly args = {
		target: Args.string({
			description: "Branch to rebase on top of.",
			required: true,
			default: "main",
		}),
		source: Args.string({
			description:
				"Branch that should be squished. If not provided, the current branch is used.",
			required: false,
		}),
	};

	protected override redirectLogToTrace = true;

	public override async run(): Promise<void> {
		const { git, getCurrentBranch } = await this.gitCapability.get();

		const sourceBranch = this.args.source ?? (await getCurrentBranch());
		const tempBranch = `squish/${sourceBranch}`;
		const targetBranch = this.args.target;

		const c = (branch: string) => {
			return branch === sourceBranch
				? chalk.red(branch)
				: branch === targetBranch
					? chalk.blue(branch)
					: branch === tempBranch
						? chalk.cyan(branch)
						: chalk.magenta(branch);
		};

		this.info(
			`Creating and checking out new branch ${c(tempBranch)} at ${c(
				targetBranch,
			)}`,
		);
		if (!this.flags["dry-run"]) {
			await git.checkoutBranch(tempBranch, targetBranch);
		}

		this.info(`Squash-merging source branch ${c(sourceBranch)}`);
		if (!this.flags["dry-run"]) {
			const result = await git.merge([sourceBranch, "--squash"]);
			if (result.failed) {
				await git.deleteLocalBranch(tempBranch, /* force */ true);
				this.errorLog(
					`Merge failed, so deleted temp branch to clean up: ${c(tempBranch)}`,
				);
				this.error("Merge failed.");
			}
		}

		const msg = `Squished branch: ${c(sourceBranch)}`;
		this.info(msg);
		if (!this.flags["dry-run"]) {
			await git.commit(stripAnsi(msg));
		}

		this.info(`Resetting source branch ${c(sourceBranch)} to ${c(tempBranch)}`);
		if (!this.flags["dry-run"]) {
			await git.checkout(sourceBranch).reset(["--hard", tempBranch]);
		}

		this.info(`Deleting temp branch: ${c(tempBranch)}`);
		if (!this.flags["dry-run"]) {
			await git.deleteLocalBranch(tempBranch, /* force */ true);
		}
	}
}
