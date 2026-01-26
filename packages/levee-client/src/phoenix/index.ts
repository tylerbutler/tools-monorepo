/**
 * Phoenix driver for Fluid Framework.
 *
 * @remarks
 * This driver enables Fluid Framework applications to connect to a Phoenix-based
 * Levee server using Phoenix Channels for real-time WebSocket communication.
 *
 * @packageDocumentation
 */

// Core driver components
export { PhoenixDocumentServiceFactory } from "./phoenixDocumentServiceFactory.js";
export { PhoenixDocumentService } from "./phoenixDocumentService.js";
export { PhoenixDocumentDeltaConnection } from "./phoenixDocumentDeltaConnection.js";
export { PhoenixDocumentStorageService } from "./phoenixDocumentStorageService.js";
export { PhoenixDocumentDeltaStorageService } from "./phoenixDocumentDeltaStorageService.js";

// URL Resolver
export { PhoenixUrlResolver } from "./urlResolver.js";

// Token Providers
export { InsecurePhoenixTokenProvider, RemotePhoenixTokenProvider } from "./tokenProvider.js";

// HTTP utilities
export { RestWrapper, RestError } from "./restWrapper.js";

// Git storage manager
export { GitManager, type IGitCreateTreeEntry, type IGitCreateTreeRequest, type IGitCreateCommitRequest } from "./gitManager.js";

// Types and interfaces
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
} from "./contracts.js";

export { NackErrorType } from "./contracts.js";
