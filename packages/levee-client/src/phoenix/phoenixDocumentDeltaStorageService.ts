/**
 * Delta storage service for Phoenix/Levee server.
 */

import type {
	IDocumentDeltaStorageService,
	IStream,
	IStreamResult,
} from "@fluidframework/driver-definitions/internal";
import type { ISequencedDocumentMessage } from "@fluidframework/protocol-definitions";

import type { IDeltaStorageResponse } from "./contracts.js";
import type { RestWrapper } from "./restWrapper.js";

/**
 * Default batch size for delta fetching.
 */
const DEFAULT_BATCH_SIZE = 2000;

/**
 * Delta storage service for fetching historical ops.
 *
 * @remarks
 * Provides access to the delta (operation) history stored on the server.
 * Used during container loading to catch up on missed operations.
 *
 * @internal
 */
export class PhoenixDocumentDeltaStorageService implements IDocumentDeltaStorageService {
	private readonly restWrapper: RestWrapper;
	private readonly deltaStorageUrl: string;

	/**
	 * Creates a new PhoenixDocumentDeltaStorageService.
	 *
	 * @param restWrapper - REST client for API requests
	 * @param deltaStorageUrl - Base URL for delta storage (e.g., /deltas/tenantId/docId)
	 */
	constructor(restWrapper: RestWrapper, deltaStorageUrl: string) {
		this.restWrapper = restWrapper;
		this.deltaStorageUrl = deltaStorageUrl;
	}

	/**
	 * Fetches deltas from the server as a stream.
	 *
	 * @param from - Starting sequence number (exclusive)
	 * @param to - Ending sequence number (inclusive)
	 * @param abortSignal - Optional signal to abort the request
	 * @param cachedOnly - Whether to only return cached deltas
	 * @param fetchReason - Reason for fetching (for telemetry)
	 * @returns A stream of delta messages
	 */
	public fetchMessages(
		from: number,
		to: number | undefined,
		abortSignal?: AbortSignal,
		cachedOnly?: boolean,
		fetchReason?: string,
	): IStream<ISequencedDocumentMessage[]> {
		let currentFrom = from;
		let done = false;

		return {
			read: async (): Promise<IStreamResult<ISequencedDocumentMessage[]>> => {
				if (done || cachedOnly) {
					return { done: true };
				}

				if (abortSignal?.aborted) {
					return { done: true };
				}

				const batchTo =
					to !== undefined
						? Math.min(currentFrom + DEFAULT_BATCH_SIZE, to)
						: currentFrom + DEFAULT_BATCH_SIZE;

				const toParam = to !== undefined ? `&to=${batchTo}` : "";
				const url = `${this.deltaStorageUrl}?from=${currentFrom}${toParam}`;

				try {
					const response = await this.restWrapper.get<IDeltaStorageResponse>(url);

					const messages = response.value ?? [];

					if (messages.length === 0) {
						done = true;
						return { done: true };
					}

					const lastSeq = messages[messages.length - 1]!.sequenceNumber;
					currentFrom = lastSeq;

					// Check if we've reached the end
					if (to !== undefined && lastSeq >= to) {
						done = true;
					}

					return { done: false, value: messages };
				} catch (error) {
					// Return done on error - the container will retry
					console.error("Error fetching deltas:", error);
					done = true;
					return { done: true };
				}
			},
		};
	}
}
