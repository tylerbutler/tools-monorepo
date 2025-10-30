import type { BuildProjectConfig } from '@tylerbu/sail-infrastructure';
import type { SimpleGit } from "simple-git";

import type { Logger } from "@tylerbu/cli-api";
import type { ISailConfig } from "./sailConfig.js";

/**
 * A context object that is passed to Sail tasks. It is used to provide easy access to commonly-needed metadata
 * or tools.
 */
export interface BuildContext {
	/**
	 * The Sail configuration for the repo.
	 */
	readonly sailConfig: ISailConfig;

	readonly buildProjectConfig: BuildProjectConfig;

	/**
	 * The absolute path to the root of the Fluid repo.
	 *
	 * @deprecated Use fluidRepoLayout.root instead.
	 */
	readonly repoRoot: string;

	/**
	 * A GitRepo object that can be used to call git operations. It is rooted at `gitRoot`.
	 */
	readonly gitRepo: SimpleGit;

	/**
	 * The path to the git repo root.
	 */
	readonly gitRoot: string;

	readonly log: Logger;
}
