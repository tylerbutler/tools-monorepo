/**
 * Client library for interacting with Levee service to create and manage Fluid containers.
 *
 * @remarks
 * The Levee client provides a simplified interface for working with Microsoft Fluid Framework
 * containers through the Levee service. It handles container lifecycle, authentication,
 * and service configuration, making it easier to build collaborative applications.
 *
 * This package includes:
 * - **LeveeClient**: High-level client for Tinylicious-compatible servers
 * - **Phoenix Driver**: Low-level driver for Phoenix Channel-based servers
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

// Phoenix driver exports
export {
	// Core driver components
	PhoenixDocumentServiceFactory,
	PhoenixDocumentService,
	PhoenixDocumentDeltaConnection,
	PhoenixDocumentStorageService,
	PhoenixDocumentDeltaStorageService,
	// URL Resolver
	PhoenixUrlResolver,
	// Token Providers
	InsecurePhoenixTokenProvider,
	RemotePhoenixTokenProvider,
	// HTTP utilities
	RestWrapper,
	RestError,
	// Git storage manager
	GitManager,
	// Enums
	NackErrorType,
} from "./phoenix/index.js";

export type {
	IPhoenixResolvedUrl,
	IPhoenixTokenClaims,
	IPhoenixUser,
	IPhoenixConfig,
	IConnectedResponse,
	IServiceConfiguration,
	IDocumentMessageInput,
	INackResponse,
	IGitBlob,
	IGitTreeEntry,
	IGitTree,
	IGitCommit,
	IDocumentVersion,
	IDeltaStorageResponse,
	DisconnectReason,
	IGitCreateTreeEntry,
	IGitCreateTreeRequest,
	IGitCreateCommitRequest,
} from "./phoenix/index.js";
