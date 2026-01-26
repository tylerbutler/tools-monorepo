/**
 * Contracts and interfaces for the Phoenix Fluid driver.
 */

import type {
	IResolvedUrl,
	ISignalClient,
	ITokenClaims,
} from "@fluidframework/driver-definitions/internal";
import type {
	ISequencedDocumentMessage,
	ISignalMessage,
} from "@fluidframework/protocol-definitions";

/**
 * Resolved URL format for Phoenix-based Levee server.
 */
export interface IPhoenixResolvedUrl extends IResolvedUrl {
	type: "fluid";

	/**
	 * The ID of the document/container.
	 */
	id: string;

	/**
	 * Full URL string.
	 */
	url: string;

	/**
	 * Tenant ID.
	 */
	tenantId: string;

	/**
	 * Document ID.
	 */
	documentId: string;

	/**
	 * WebSocket URL for Phoenix socket connection.
	 * e.g., ws://localhost:4000/socket
	 */
	socketUrl: string;

	/**
	 * HTTP base URL for REST API calls.
	 * e.g., http://localhost:4000
	 */
	httpUrl: string;

	/**
	 * Optional endpoints for specific services.
	 */
	endpoints: {
		deltaStorageUrl: string;
		storageUrl: string;
	};

	/**
	 * JWT tokens for authentication.
	 */
	tokens: { [scope: string]: string };
}

/**
 * Token claims for Phoenix authentication.
 */
export interface IPhoenixTokenClaims extends ITokenClaims {
	tenantId: string;
	documentId: string;
	scopes: string[];
	user: IPhoenixUser;
	iat: number;
	exp: number;
	ver: string;
}

/**
 * User information for token generation.
 */
export interface IPhoenixUser {
	id: string;
	name?: string;
	email?: string;
	additionalDetails?: Record<string, unknown>;
}

/**
 * Configuration for creating Phoenix driver components.
 */
export interface IPhoenixConfig {
	/**
	 * WebSocket URL for Phoenix socket.
	 */
	socketUrl: string;

	/**
	 * HTTP base URL for REST API.
	 */
	httpUrl: string;

	/**
	 * Default tenant ID (optional).
	 */
	tenantId?: string;

	/**
	 * Connection timeout in milliseconds.
	 */
	connectionTimeoutMs?: number;

	/**
	 * Whether to enable debug logging.
	 */
	debug?: boolean;
}

/**
 * Response received on successful document connection.
 */
export interface IConnectedResponse {
	clientId: string;
	existing: boolean;
	maxMessageSize: number;
	parentBranch: string | null;
	version: string;
	initialMessages: ISequencedDocumentMessage[];
	initialSignals: ISignalMessage[];
	initialClients: ISignalClient[];
	serviceConfiguration: IServiceConfiguration;
	claims: IPhoenixTokenClaims;
	mode: "write" | "read";
	epoch?: string;
	supportedVersions?: string[];
}

/**
 * Service configuration from server.
 */
export interface IServiceConfiguration {
	blockSize: number;
	maxMessageSize: number;
	summary?: {
		idleTime?: number;
		maxOps?: number;
		maxAckWaitTime?: number;
		maxTime?: number;
	};
}

/**
 * Document message input format for submission.
 */
export interface IDocumentMessageInput {
	type: string;
	contents: unknown;
	clientSequenceNumber: number;
	referenceSequenceNumber: number;
	metadata?: Record<string, unknown>;
	compression?: string;
}

/**
 * Nack (negative acknowledgment) response.
 */
export interface INackResponse {
	operation: unknown;
	sequenceNumber: number;
	content: {
		code: number;
		type: NackErrorType;
		message: string;
		retryAfter?: number;
	};
}

/**
 * Types of nack errors.
 */
// biome-ignore lint/style/noEnum: required for Fluid Framework protocol compatibility
export enum NackErrorType {
	ThrottlingError = "ThrottlingError",
	InvalidScopeError = "InvalidScopeError",
	BadRequestError = "BadRequestError",
	LimitExceededError = "LimitExceededError",
	InvalidOperation = "InvalidOperation",
}

/**
 * Git blob reference.
 */
export interface IGitBlob {
	content: string;
	encoding: "base64" | "utf-8";
	sha: string;
	size: number;
	url: string;
}

/**
 * Git tree entry.
 */
export interface IGitTreeEntry {
	mode: string;
	path: string;
	sha: string;
	size?: number;
	type: "blob" | "tree";
	url: string;
}

/**
 * Git tree structure.
 */
export interface IGitTree {
	sha: string;
	tree: IGitTreeEntry[];
	url: string;
}

/**
 * Git commit information.
 */
export interface IGitCommit {
	sha: string;
	url: string;
	author: {
		name: string;
		email: string;
		date: string;
	};
	committer: {
		name: string;
		email: string;
		date: string;
	};
	message: string;
	tree: {
		sha: string;
		url: string;
	};
	parents: Array<{
		sha: string;
		url: string;
	}>;
}

/**
 * Document version information.
 */
export interface IDocumentVersion {
	id: string;
	treeId: string;
	date?: string;
}

/**
 * Delta storage response format.
 */
export interface IDeltaStorageResponse {
	value: ISequencedDocumentMessage[];
}

/**
 * Reason for disconnection.
 */
export type DisconnectReason =
	| "client"
	| "server"
	| "error"
	| "unauthorized"
	| "timeout";
