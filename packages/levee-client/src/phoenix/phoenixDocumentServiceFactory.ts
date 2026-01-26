/**
 * Document service factory for Phoenix/Levee server.
 */

import type { ITelemetryBaseLogger } from "@fluidframework/core-interfaces";
import type {
	IDocumentService,
	IDocumentServiceFactory,
	IResolvedUrl,
} from "@fluidframework/driver-definitions/internal";
import type { ISummaryTree } from "@fluidframework/protocol-definitions";
import type { ITokenProvider } from "@fluidframework/routerlicious-driver";

import type { IPhoenixResolvedUrl } from "./contracts.js";
import { PhoenixDocumentService } from "./phoenixDocumentService.js";
import { RestWrapper } from "./restWrapper.js";

/**
 * Protocol identifier for this document service factory.
 */
const PHOENIX_PROTOCOL_NAME = "phoenix";

/**
 * Document service factory for Phoenix/Levee server.
 *
 * @remarks
 * Creates document services that connect to a Phoenix-based Fluid server.
 * This is the main entry point for the Phoenix driver.
 *
 * @example
 * ```typescript
 * const tokenProvider = new InsecurePhoenixTokenProvider(
 *   "tenant-secret-key",
 *   { id: "user-123", name: "Test User" }
 * );
 *
 * const factory = new PhoenixDocumentServiceFactory(tokenProvider);
 *
 * // Use with Fluid container loader
 * const loader = new Loader({
 *   urlResolver,
 *   documentServiceFactory: factory,
 *   codeLoader,
 * });
 * ```
 *
 * @public
 */
export class PhoenixDocumentServiceFactory implements IDocumentServiceFactory {
	/**
	 * Protocol name for this factory.
	 */
	public readonly protocolName = PHOENIX_PROTOCOL_NAME;

	private readonly tokenProvider: ITokenProvider;

	/**
	 * Creates a new PhoenixDocumentServiceFactory.
	 *
	 * @param tokenProvider - Token provider for authentication
	 */
	constructor(tokenProvider: ITokenProvider) {
		this.tokenProvider = tokenProvider;
	}

	/**
	 * Creates a document service for an existing document.
	 *
	 * @param resolvedUrl - Resolved URL containing document connection info
	 * @param logger - Optional telemetry logger
	 * @param clientIsSummarizer - Whether the client is a summarizer
	 * @returns Document service instance
	 */
	public async createDocumentService(
		resolvedUrl: IResolvedUrl,
		logger?: ITelemetryBaseLogger,
		clientIsSummarizer?: boolean,
	): Promise<IDocumentService> {
		return new PhoenixDocumentService(resolvedUrl, this.tokenProvider);
	}

	/**
	 * Creates a new document container on the server.
	 *
	 * @remarks
	 * This method creates a new document on the server and returns a document
	 * service connected to it. The summary tree is used to initialize the
	 * document's initial state.
	 *
	 * @param createNewSummary - Initial summary tree for the new document
	 * @param createNewResolvedUrl - Resolved URL for document creation
	 * @param logger - Optional telemetry logger
	 * @param clientIsSummarizer - Whether the client is a summarizer
	 * @returns Document service connected to the new document
	 */
	public async createContainer(
		createNewSummary: ISummaryTree | undefined,
		createNewResolvedUrl: IResolvedUrl,
		logger?: ITelemetryBaseLogger,
		clientIsSummarizer?: boolean,
	): Promise<IDocumentService> {
		const phoenixUrl = createNewResolvedUrl as IPhoenixResolvedUrl;

		// Create the document on the server
		const restWrapper = new RestWrapper(
			phoenixUrl.httpUrl,
			this.tokenProvider,
			phoenixUrl.tenantId,
			"", // No document ID yet
		);

		const createResponse = await restWrapper.post<{ id: string }>(
			`/documents/${phoenixUrl.tenantId}`,
			{
				id: phoenixUrl.documentId || undefined, // Let server generate if not provided
			},
		);

		// Update resolved URL with the document ID from server
		const updatedUrl: IPhoenixResolvedUrl = {
			...phoenixUrl,
			id: createResponse.id,
			documentId: createResponse.id,
			url: `${phoenixUrl.httpUrl}/${phoenixUrl.tenantId}/${createResponse.id}`,
			endpoints: {
				deltaStorageUrl: `${phoenixUrl.httpUrl}/deltas/${phoenixUrl.tenantId}/${createResponse.id}`,
				storageUrl: `${phoenixUrl.httpUrl}/repos/${phoenixUrl.tenantId}`,
			},
		};

		return new PhoenixDocumentService(updatedUrl, this.tokenProvider);
	}
}
