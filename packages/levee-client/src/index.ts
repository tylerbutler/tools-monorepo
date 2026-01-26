/**
 * Client library for interacting with Levee service to create and manage Fluid containers.
 *
 * @remarks
 * The Levee client provides a simplified interface for working with Microsoft Fluid Framework
 * containers through the Levee service. It handles container lifecycle, authentication,
 * and service configuration, making it easier to build collaborative applications.
 *
 * For low-level Phoenix Channels driver support, see the `@tylerbu/levee-driver` package.
 *
 * @packageDocumentation
 */

// Re-export so developers have access to parameter types for createContainer/getContainer without pulling in fluid-static
export type { CompatibilityMode } from "@fluidframework/fluid-static";
// Re-export useful types and utilities from levee-driver
export type {
	LeveeConfig,
	LeveeUser as DriverLeveeUser,
} from "@tylerbu/levee-driver";
export {
	InsecureLeveeTokenProvider,
	RemoteLeveeTokenProvider,
} from "@tylerbu/levee-driver";
// Client
export { LeveeClient } from "./client.js";
// Types
export type {
	ILeveeAudience,
	LeveeClientProps,
	LeveeConnectionConfig,
	LeveeContainerServices,
	LeveeMember,
	LeveeUser,
} from "./interfaces.js";
