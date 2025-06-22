/**
 * Client library for interacting with Levee service to create and manage Fluid containers.
 *
 * @remarks
 * The Levee client provides a simplified interface for working with Microsoft Fluid Framework
 * containers through the Levee service. It handles container lifecycle, authentication,
 * and service configuration, making it easier to build collaborative applications.
 *
 * @packageDocumentation
 */


// Re-export so developers have access to parameter types for createContainer/getContainer without pulling in fluid-static
export type { CompatibilityMode } from "@fluidframework/fluid-static";
export { LeveeClient } from "./client.js";

export type {
	ILeveeAudience,
	LeveeClientProps,
	LeveeConnectionConfig,
	LeveeContainerServices,
	LeveeMember,
	LeveeUser,
} from "./interfaces.js";
