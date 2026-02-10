/**
 * Levee driver configuration wrapper for the DiceRoller example.
 *
 * This module provides configured instances of the Levee driver components
 * for connecting to a Levee server.
 */

import type { IRequest } from "@fluidframework/core-interfaces/legacy";
import {
	InsecureLeveeTokenProvider,
	LeveeDocumentServiceFactory,
	LeveeUrlResolver,
} from "@tylerbu/levee-driver";

// Default configuration for local development
const DEFAULT_HTTP_URL = "http://localhost:4000";
const DEFAULT_SOCKET_URL = "ws://localhost:4000/socket";
const DEFAULT_TENANT_KEY = "dev-tenant-secret-key";
const DEFAULT_TENANT_ID = "fluid";

/**
 * Configuration options for the Levee driver.
 */
export interface LeveeDriverConfig {
	/** HTTP URL of the Levee server */
	httpUrl?: string;
	/** WebSocket URL of the Levee server */
	socketUrl?: string;
	/** Tenant secret key for authentication */
	tenantKey?: string;
	/** Tenant ID */
	tenantId?: string;
	/** User information */
	user?: {
		id: string;
		name: string;
	};
}

/**
 * Creates configured Levee driver components.
 */
export function createLeveeDriver(config: LeveeDriverConfig = {}) {
	const httpUrl = config.httpUrl ?? DEFAULT_HTTP_URL;
	const socketUrl = config.socketUrl ?? DEFAULT_SOCKET_URL;
	const tenantKey = config.tenantKey ?? DEFAULT_TENANT_KEY;
	const tenantId = config.tenantId ?? DEFAULT_TENANT_ID;
	const user = config.user ?? {
		id: `user-${Date.now()}`,
		name: "Anonymous User",
	};

	// Create token provider for authentication
	const tokenProvider = new InsecureLeveeTokenProvider(tenantKey, user);

	// Create URL resolver
	const urlResolver = new LeveeUrlResolver(socketUrl, httpUrl);

	// Create document service factory
	const documentServiceFactory = new LeveeDocumentServiceFactory(tokenProvider);

	/**
	 * Creates a request for a new document.
	 */
	function createCreateNewRequest(documentId: string): IRequest {
		return {
			url: `${tenantId}/${documentId}`,
			headers: {
				createNew: true,
			},
		};
	}

	/**
	 * Creates a request to load an existing document.
	 */
	function createLoadExistingRequest(documentId: string): IRequest {
		return {
			url: `${tenantId}/${documentId}`,
		};
	}

	return {
		urlResolver,
		documentServiceFactory,
		tokenProvider,
		createCreateNewRequest,
		createLoadExistingRequest,
		config: {
			httpUrl,
			socketUrl,
			tenantId,
		},
	};
}
