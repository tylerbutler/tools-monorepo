/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import type { IFluidBuildDirs } from "./config.js";
import type { IBuildProject, IWorkspace, WorkspaceName } from "./types.js";
/**
 * Loads workspaces based on the "legacy" config -- the former repoPackages section of the fluid-build config.
 *
 * **ONLY INTENDED FOR BACK-COMPAT.**
 *
 * @param entry - The config entry.
 * @param buildProject - The BuildProject the workspace belongs to.
 */
export declare function loadWorkspacesFromLegacyConfig(config: IFluidBuildDirs, buildProject: IBuildProject): Map<WorkspaceName, IWorkspace>;
//# sourceMappingURL=workspaceCompat.d.ts.map