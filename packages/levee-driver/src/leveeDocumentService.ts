/**
 * Document service for Levee server.
 */

import type {
	IDocumentDeltaConnection,
	IDocumentDeltaStorageService,
	IDocumentService,
	IDocumentServiceEvents,
	IDocumentStorageService,
	IResolvedUrl,
} from "@fluidframework/driver-definitions/internal";
import type { IClient } from "@fluidframework/protocol-definitions";
import type { ITokenProvider } from "@fluidframework/routerlicious-driver";
import { EventEmitterWithErrorHandling } from "@fluidframework/telemetry-utils/internal";

import type { LeveeResolvedUrl } from "./contracts.js";
import { LeveeDeltaConnection } from "./leveeDeltaConnection.js";
import { LeveeDeltaStorageService } from "./leveeDeltaStorageService.js";
import { LeveeStorageService } from "./leveeStorageService.js";
import { RestWrapper } from "./restWrapper.js";

/**
 * Document service implementation for Levee server.
 *
 * @remarks
 * Coordinates the storage service, delta storage service, and delta connection
 * for a single document. Created by LeveeDocumentServiceFactory.
 *
 * @public
 */
export class LeveeDocumentService
	extends EventEmitterWithErrorHandling<IDocumentServiceEvents>
	implements IDocumentService
{
	/**
	 * Resolved URL containing connection details.
	 */
	public readonly resolvedUrl: LeveeResolvedUrl;

	private readonly tokenProvider: ITokenProvider;
	private readonly restWrapper: RestWrapper;
	private _disposed = false;

	/**
	 * Creates a new LeveeDocumentService.
	 *
	 * @param resolvedUrl - Resolved URL with connection details
	 * @param tokenProvider - Token provider for authentication
	 */
	public constructor(resolvedUrl: IResolvedUrl, tokenProvider: ITokenProvider) {
		super((eventName, error) =>
			// biome-ignore lint/suspicious/noConsole: error handler for event emitter
			console.error(`Error in event ${String(eventName)}:`, error),
		);

		this.resolvedUrl = resolvedUrl as LeveeResolvedUrl;
		this.tokenProvider = tokenProvider;

		this.restWrapper = new RestWrapper(
			this.resolvedUrl.httpUrl,
			this.tokenProvider,
			this.resolvedUrl.tenantId,
			this.resolvedUrl.documentId,
		);
	}

	/**
	 * Whether this service has been disposed.
	 */
	public get disposed(): boolean {
		return this._disposed;
	}

	/**
	 * Connects to the document storage service.
	 *
	 * @returns The storage service for blob and snapshot operations
	 */
	public async connectToStorage(): Promise<IDocumentStorageService> {
		return new LeveeStorageService(
			this.restWrapper,
			this.resolvedUrl.tenantId,
			this.resolvedUrl.documentId,
		);
	}

	/**
	 * Connects to the delta storage service.
	 *
	 * @returns The delta storage service for historical ops
	 */
	public async connectToDeltaStorage(): Promise<IDocumentDeltaStorageService> {
		return new LeveeDeltaStorageService(
			this.restWrapper,
			this.resolvedUrl.endpoints.deltaStorageUrl,
		);
	}

	/**
	 * Connects to the real-time delta stream via Phoenix Channels.
	 *
	 * @param client - Client information for connection
	 * @returns The delta connection for real-time ops and signals
	 */
	public async connectToDeltaStream(
		client: IClient,
	): Promise<IDocumentDeltaConnection> {
		// Get fresh token for connection
		const tokenResponse = await this.tokenProvider.fetchOrdererToken(
			this.resolvedUrl.tenantId,
			this.resolvedUrl.documentId,
		);

		const mode = client.mode === "read" ? "read" : "write";

		return LeveeDeltaConnection.create(
			this.resolvedUrl.socketUrl,
			this.resolvedUrl.tenantId,
			this.resolvedUrl.documentId,
			tokenResponse.jwt,
			client,
			mode,
		);
	}

	/**
	 * Disposes the document service and releases resources.
	 */
	public dispose(): void {
		if (this._disposed) {
			return;
		}

		this._disposed = true;
		this.removeAllListeners();
	}
}
