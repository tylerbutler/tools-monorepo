/**
 * Remark configuration for README automation.
 *
 * Used by `pnpm update:readme` to generate:
 * - Table of contents (via remark-toc)
 * - Task table from Nx targets (via remark-task-table)
 * - Workspace packages table (via remark-workspace-packages)
 */

import remarkGfm from "remark-gfm";
import { remarkTaskTable } from "remark-task-table";
import remarkToc from "remark-toc";
import { remarkWorkspacePackages } from "remark-workspace-packages";

const config = {
	plugins: [
		remarkGfm,
		[remarkToc, { heading: "Contents", tight: true }],
		[
			remarkTaskTable,
			{
				sectionPrefix: "task-table",
				includeNx: true,
				exclude: ["*:*"],
			},
		],
		remarkWorkspacePackages,
	],
};

export default config;
