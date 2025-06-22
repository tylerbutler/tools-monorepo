import assert from "node:assert/strict";
import process from "node:process";
import { Args } from "@oclif/core";
import {
	checkConflicts,
	GitCommand,
	getMergeBase,
	revList,
	shortCommit,
} from "@tylerbu/cli-api";
import chalk from "picocolors";

interface CleanupBranch {
	branch: string;
	local: boolean;
	remote: boolean;
}

export default class MergeTrainPreviewCommand extends GitCommand<
	typeof MergeTrainPreviewCommand
> {
	static override readonly state = "alpha";
	static override readonly hidden = true;
	static override readonly description =
		"Previews the merge train between two branches. ALPHA QUALITY.";

	static override readonly aliases: string[] = ["mtp"];

	// static flags = {
	//   ...BaseCommand.flags,
	// };

	static override args = {
		target: Args.string({
			description: "Branch to merge commits into.",
			required: true,
		}),
		source: Args.string({
			description:
				"Branch from which commits are merged. If not provided, the current branch is used.",
			required: false,
		}),
	};

	// protected redirectLogToTrace = true;

	/**
	 * The branch that the command was run from. This is used to checkout the branch in the case of a failure, so the user
	 * is on the starting branch.
	 */
	private initialBranch = "";

	/**
	 * A list of local branches that should be deleted if the command fails. The local/remote booleans indicate whether
	 * the branch should be cleaned up locally, remotely, or both.
	 */
	private readonly branchesToCleanup: CleanupBranch[] = [];

	async run(): Promise<void> {
		this.verbose("starting");
		if (this.repo === undefined || this.git === undefined) {
			this.error(`Not a git repo: ${process.cwd()}`);
		}

		this.initialBranch = (await this.git.status()).current ?? "main";
		const sourceBranch = this.args.source ?? this.initialBranch;
		const tempBranch = `merge-train/${sourceBranch}`;
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

		const lastMergedCommit = await getMergeBase(
			this.git,
			sourceBranch,
			targetBranch,
		);
		this.log(
			`${shortCommit(
				lastMergedCommit,
			)} is the last merged commit id between ${c(sourceBranch)} and ${c(
				targetBranch,
			)}`,
		);

		const unmergedCommitList: string[] = await revList(
			this.git,
			lastMergedCommit,
			sourceBranch,
		);

		// sort chronologically; oldest first
		unmergedCommitList.reverse();

		if (unmergedCommitList.length === 0) {
			this.log(
				chalk.green(
					`${c(sourceBranch)} and ${c(targetBranch)} branches are in sync.`,
				),
			);
			return;
		}

		this.log(
			`There are ${unmergedCommitList.length} unmerged commits between the ${c(
				sourceBranch,
			)} and ${c(targetBranch)} branches.`,
		);

		/**
		 * tempBranchToCheckConflicts is used to check the conflicts of each commit with the target branch.
		 */
		const tempBranchToCheckConflicts = `${targetBranch}-check-conflicts`;

		/**
		 * tempTargetBranch is a local branch created from the target branch. We use this instead of the
		 * target branch itself because the repo might already have a tracking branch for the target and we don't want to
		 * change that.
		 */
		const tempTargetBranch = `${targetBranch}-merge-head`;

		// Clean up these branches on failure.
		this.branchesToCleanup.push(
			{
				branch: tempBranchToCheckConflicts,
				local: true,
				remote: false,
			},
			{
				branch: tempTargetBranch,
				local: true,
				remote: false,
			},
		);

		// Check out a new temp branch at the same commit as the target branch.
		await this.git.checkoutBranch(tempBranchToCheckConflicts, targetBranch);

		const commitMergeability = await checkConflicts(
			this.git,
			unmergedCommitList,
			this,
		);

		for (const { commit, mergeability } of commitMergeability) {
			const color =
				mergeability === "clean"
					? chalk.green
					: mergeability === "conflict"
						? chalk.red
						: chalk.yellow;
			this.log(`${commit}\t${color(mergeability)}`);
		}

		await this.doCleanup();
	}

	protected override async catch(
		error: Error & { exitCode?: number },
	): Promise<unknown> {
		if (this.git === undefined) {
			throw error;
		}

		if (
			// this.flags.cleanup === true &&
			error.exitCode !== undefined &&
			error.exitCode !== 0
		) {
			await this.doCleanup();
		}

		return super.catch(error);
	}

	private async doCleanup(): Promise<void> {
		assert(this.git !== undefined);

		// Check out the initial branch
		this.verbose(`CLEANUP: Checking out initial branch ${this.initialBranch}`);
		await this.git.checkout(this.initialBranch);

		// Delete the branches we created
		if (this.branchesToCleanup.length > 0) {
			this.verbose(
				`CLEANUP: Deleting local branches: ${this.branchesToCleanup
					.map((b) => b.branch)
					.join(", ")}`,
			);
			await this.git.deleteLocalBranches(
				this.branchesToCleanup.filter((b) => b.local).map((b) => b.branch),
				true /* forceDelete */,
			);
		}

		// Delete any remote branches we created
		// const promises: Promise<unknown>[] = [];
		// const deleteFunction = async (branch: string) => {
		// 	this.log(`CLEANUP: Deleting remote branch ${this.remote}/${branch}`);
		// 	try {
		// 		await this.gitRepo?.gitClient.push(this.remote, branch, ["--delete"]);
		// 	} catch {
		// 		this.verbose(`CLEANUP: FAILED to delete remote branch ${this.remote}/${branch}`);
		// 	}
		// };
		// for (const branch of this.branchesToCleanup.filter((b) => b.remote)) {
		// 	promises.push(deleteFunction(branch.branch));
		// }
		// await Promise.all(promises);
	}
}
