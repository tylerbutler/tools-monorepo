/**
 * Contracts and interfaces for the Levee Fluid driver.
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
 * Resolved URL format for Levee server.
 */
export interface LeveeResolvedUrl extends IResolvedUrl {
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
 * Token claims for Levee authentication.
 */
export interface LeveeTokenClaims extends ITokenClaims {
	tenantId: string;
	documentId: string;
	scopes: string[];
	user: LeveeUser;
	iat: number;
	exp: number;
	ver: string;
}

/**
 * User information for token generation.
 */
export interface LeveeUser {
	id: string;
	name?: string;
	email?: string;
	additionalDetails?: Record<string, unknown>;
}

/**
 * Configuration for creating Levee driver components.
 */
export interface LeveeConfig {
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
 * Checks if debug logging is enabled via environment variable or config.
 *
 * @param configDebug - Optional debug flag from configuration
 * @returns True if debug logging should be enabled
 */
export function isDebugEnabled(configDebug?: boolean): boolean {
	if (configDebug !== undefined) {
		return configDebug;
	}
	// Check environment variable (works in Node.js)
	// biome-ignore lint/style/noProcessEnv: checking for debug env var
	if (typeof process !== "undefined" && process.env) {
		// biome-ignore lint/style/noProcessEnv: checking for debug env var
		const debugValue = process.env["LEVEE_DEBUG"];
		return debugValue === "true" || debugValue === "1";
	}
	return false;
}

/**
 * Debug logger that only logs when debug mode is enabled.
 */
export class LeveeDebugLogger {
	private readonly enabled: boolean;
	private readonly prefix: string;

	public constructor(component: string, enabled?: boolean) {
		this.prefix = `[Levee:${component}]`;
		this.enabled = isDebugEnabled(enabled);
	}

	public log(message: string, ...args: unknown[]): void {
		if (this.enabled) {
			// biome-ignore lint/suspicious/noConsole: intentional debug logging
			console.debug(this.prefix, message, ...args);
		}
	}

	public logRequest(method: string, url: string, body?: unknown): void {
		if (this.enabled) {
			// biome-ignore lint/suspicious/noConsole: intentional debug logging
			console.debug(
				this.prefix,
				`${method} ${url}`,
				body !== undefined ? { body } : "",
			);
		}
	}

	public logResponse(
		method: string,
		url: string,
		status: number,
		body?: unknown,
	): void {
		if (this.enabled) {
			// biome-ignore lint/suspicious/noConsole: intentional debug logging
			console.debug(
				this.prefix,
				`${method} ${url} -> ${status}`,
				body !== undefined ? { body } : "",
			);
		}
	}
}

/**
 * Response received on successful document connection.
 */
export interface ConnectedResponse {
	clientId: string;
	existing: boolean;
	maxMessageSize: number;
	parentBranch: string | null;
	version: string;
	initialMessages: ISequencedDocumentMessage[];
	initialSignals: ISignalMessage[];
	initialClients: ISignalClient[];
	serviceConfiguration: ServiceConfiguration;
	claims: LeveeTokenClaims;
	mode: "write" | "read";
	epoch?: string;
	supportedVersions?: string[];
}

/**
 * Service configuration from server.
 */
export interface ServiceConfiguration {
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
export interface DocumentMessageInput {
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
export interface NackResponse {
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
export interface GitBlob {
	content: string;
	encoding: "base64" | "utf-8";
	sha: string;
	size: number;
	url: string;
}

/**
 * Git tree entry.
 */
export interface GitTreeEntry {
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
export interface GitTree {
	sha: string;
	tree: GitTreeEntry[];
	url: string;
}

/**
 * Git commit information.
 */
export interface GitCommit {
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
export interface DocumentVersion {
	id: string;
	treeId: string;
	date?: string;
}

/**
 * Delta storage response format.
 */
export interface DeltaStorageResponse {
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

// ============================================================================
// Response Normalization Utilities
// ============================================================================

/**
 * Converts a snake_case string to camelCase.
 */
function snakeToCamel(str: string): string {
	return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * Recursively converts snake_case keys to camelCase in an object.
 *
 * @param obj - The object to normalize
 * @returns A new object with camelCase keys
 */
export function normalizeKeys<T>(obj: unknown): T {
	if (obj === null || obj === undefined) {
		return obj as T;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => normalizeKeys(item)) as T;
	}

	if (typeof obj === "object") {
		const normalized: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			const camelKey = snakeToCamel(key);
			normalized[camelKey] = normalizeKeys(value);
		}
		return normalized as T;
	}

	return obj as T;
}

/**
 * Default values for ConnectedResponse fields.
 */
const CONNECTED_RESPONSE_DEFAULTS: Partial<ConnectedResponse> = {
	existing: false,
	maxMessageSize: 16 * 1024, // 16KB
	parentBranch: null,
	version: "0.1",
	initialMessages: [],
	initialSignals: [],
	initialClients: [],
	serviceConfiguration: {
		blockSize: 64 * 1024,
		maxMessageSize: 16 * 1024,
	},
	mode: "write",
};

/**
 * Normalizes a raw server response into a ConnectedResponse.
 *
 * Handles:
 * - snake_case to camelCase conversion
 * - Missing optional fields with defaults
 * - Type coercion for common fields
 *
 * @param raw - Raw response from server
 * @returns Normalized ConnectedResponse
 */
export function normalizeConnectedResponse(raw: unknown): ConnectedResponse {
	if (!raw || typeof raw !== "object") {
		throw new Error("Invalid connected response: expected object");
	}

	// First normalize keys from snake_case to camelCase
	const normalized = normalizeKeys<Record<string, unknown>>(raw);

	// Validate required fields
	if (!normalized["clientId"] || typeof normalized["clientId"] !== "string") {
		throw new Error("Invalid connected response: missing clientId");
	}

	// Apply defaults and return
	return {
		...CONNECTED_RESPONSE_DEFAULTS,
		...normalized,
		clientId: normalized["clientId"] as string,
		claims: normalized["claims"] as LeveeTokenClaims,
	} as ConnectedResponse;
}

/**
 * Normalizes an incoming op event payload.
 *
 * The server might send ops in different formats:
 * - { documentId: string, ops: [...] }
 * - { ops: [...] }
 * - [...] (array directly)
 *
 * @param payload - Raw payload from server
 * @param fallbackDocId - Document ID to use if not in payload
 * @returns Normalized payload with documentId and ops array
 */
export function normalizeOpPayload(
	payload: unknown,
	fallbackDocId: string,
): { documentId: string; ops: ISequencedDocumentMessage[] } {
	// Handle array directly
	if (Array.isArray(payload)) {
		return {
			documentId: fallbackDocId,
			ops: normalizeKeys<ISequencedDocumentMessage[]>(payload),
		};
	}

	if (!payload || typeof payload !== "object") {
		return { documentId: fallbackDocId, ops: [] };
	}

	const normalized = normalizeKeys<Record<string, unknown>>(payload);
	const ops = normalized["ops"];
	const documentId =
		typeof normalized["documentId"] === "string"
			? normalized["documentId"]
			: fallbackDocId;

	return {
		documentId,
		ops: Array.isArray(ops)
			? normalizeKeys<ISequencedDocumentMessage[]>(ops)
			: [],
	};
}
