/**
 * Phoenix driver for Fluid Framework.
 *
 * @remarks
 * This driver enables Fluid Framework applications to connect to a Phoenix-based
 * Levee server using Phoenix Channels for real-time WebSocket communication.
 *
 * @packageDocumentation
 */

// Types and interfaces
export type {
	DisconnectReason,
	IConnectedResponse,
	IDeltaStorageResponse,
	IDocumentMessageInput,
	IDocumentVersion,
	IGitBlob,
	IGitCommit,
	IGitTree,
	IGitTreeEntry,
	INackResponse,
	IPhoenixConfig,
	IPhoenixResolvedUrl,
	IPhoenixTokenClaims,
	IPhoenixUser,
	IServiceConfiguration,
} from "./contracts.js";
export { NackErrorType } from "./contracts.js";
// Git storage manager
export {
	GitManager,
	type IGitCreateCommitRequest,
	type IGitCreateTreeEntry,
	type IGitCreateTreeRequest,
} from "./gitManager.js";
export { PhoenixDocumentDeltaConnection } from "./phoenixDocumentDeltaConnection.js";
export { PhoenixDocumentDeltaStorageService } from "./phoenixDocumentDeltaStorageService.js";
export { PhoenixDocumentService } from "./phoenixDocumentService.js";
// Core driver components
export { PhoenixDocumentServiceFactory } from "./phoenixDocumentServiceFactory.js";
export { PhoenixDocumentStorageService } from "./phoenixDocumentStorageService.js";
// HTTP utilities
export { RestError, RestWrapper } from "./restWrapper.js";
// Token Providers
export {
	InsecurePhoenixTokenProvider,
	RemotePhoenixTokenProvider,
} from "./tokenProvider.js";
// URL Resolver
export { PhoenixUrlResolver } from "./urlResolver.js";
