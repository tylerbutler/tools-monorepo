/**
 * Document service factory for Levee server.
 */

import type { ITelemetryBaseLogger } from "@fluidframework/core-interfaces";
import type {
	IDocumentService,
	IDocumentServiceFactory,
	IResolvedUrl,
} from "@fluidframework/driver-definitions/internal";
import type { ISummaryTree } from "@fluidframework/protocol-definitions";
import type { ITokenProvider } from "@fluidframework/routerlicious-driver";

import type { LeveeResolvedUrl } from "./contracts.js";
import { LeveeDocumentService } from "./leveeDocumentService.js";
import { RestWrapper } from "./restWrapper.js";

/**
 * Protocol identifier for this document service factory.
 */
const LEVEE_PROTOCOL_NAME = "levee";

/**
 * Document service factory for Levee server.
 *
 * @remarks
 * Creates document services that connect to a Levee Fluid server.
 * This is the main entry point for the Levee driver.
 *
 * @example
 * ```typescript
 * const tokenProvider = new InsecureLeveeTokenProvider(
 *   "tenant-secret-key",
 *   { id: "user-123", name: "Test User" }
 * );
 *
 * const factory = new LeveeDocumentServiceFactory(tokenProvider);
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
export class LeveeDocumentServiceFactory implements IDocumentServiceFactory {
	/**
	 * Protocol name for this factory.
	 */
	public readonly protocolName = LEVEE_PROTOCOL_NAME;

	private readonly tokenProvider: ITokenProvider;

	/**
	 * Creates a new LeveeDocumentServiceFactory.
	 *
	 * @param tokenProvider - Token provider for authentication
	 */
	public constructor(tokenProvider: ITokenProvider) {
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
		_logger?: ITelemetryBaseLogger,
		_clientIsSummarizer?: boolean,
	): Promise<IDocumentService> {
		return new LeveeDocumentService(resolvedUrl, this.tokenProvider);
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
		_createNewSummary: ISummaryTree | undefined,
		createNewResolvedUrl: IResolvedUrl,
		_logger?: ITelemetryBaseLogger,
		_clientIsSummarizer?: boolean,
	): Promise<IDocumentService> {
		const leveeUrl = createNewResolvedUrl as LeveeResolvedUrl;

		// Create the document on the server
		const restWrapper = new RestWrapper(
			leveeUrl.httpUrl,
			this.tokenProvider,
			leveeUrl.tenantId,
			"", // No document ID yet
		);

		const createResponse = await restWrapper.post<{ id: string }>(
			`/documents/${leveeUrl.tenantId}`,
			{
				id: leveeUrl.documentId || undefined, // Let server generate if not provided
			},
		);

		// Update resolved URL with the document ID from server
		const updatedUrl: LeveeResolvedUrl = {
			...leveeUrl,
			id: createResponse.id,
			documentId: createResponse.id,
			url: `${leveeUrl.httpUrl}/${leveeUrl.tenantId}/${createResponse.id}`,
			endpoints: {
				deltaStorageUrl: `${leveeUrl.httpUrl}/deltas/${leveeUrl.tenantId}/${createResponse.id}`,
				storageUrl: `${leveeUrl.httpUrl}/repos/${leveeUrl.tenantId}`,
			},
		};

		return new LeveeDocumentService(updatedUrl, this.tokenProvider);
	}
}
