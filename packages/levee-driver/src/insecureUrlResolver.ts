import type { IRequest } from "@fluidframework/core-interfaces";
import {
	DriverHeader,
	type IResolvedUrl,
	type IUrlResolver,
} from "@fluidframework/driver-definitions/internal";

/**
 * Default endpoint port. Will be used by the service if the consumer does not specify a port.
 *
 * @beta
 */
export const defaultPort = 7070;

/**
 * Default endpoint URL base. Will be used by the service if the consumer does not specify an endpoint.
 *
 * @beta
 */
export const defaultEndpoint = "http://localhost";

/**
 * InsecureUrlResolver knows how to get the URLs to the service to use
 * for a given request.  This particular implementation has a goal to avoid imposing requirements on the app's
 * URL shape, so it expects the request url to have this format (as opposed to a more traditional URL):
 * documentId/containerRelativePathing
 *
 * @beta
 */
export class InsecureUrlResolver implements IUrlResolver {
	private readonly endpoint: string;
	public constructor(port = defaultPort, endpoint = defaultEndpoint) {
		this.endpoint = `${endpoint}:${port}`;
	}

	// biome-ignore lint/suspicious/useAwait: interface
	public async resolve(request: IRequest): Promise<IResolvedUrl> {
		const relativeUrl = request.url.replace(`${this.endpoint}/`, "");
		const documentIdFromRequest = relativeUrl.split("/")[0];

		let deltaStorageUrl: string;
		let documentUrl: string;
		const finalDocumentId: string = documentIdFromRequest;

		// Special handling if the request is to create a new container
		if (request.headers && request.headers[DriverHeader.createNew] === true) {
			deltaStorageUrl = `${this.endpoint}/deltas/tinylicious/${finalDocumentId}`;
			documentUrl = `${this.endpoint}/tinylicious/${finalDocumentId}`;
		} else {
			const encodedDocId = encodeURIComponent(finalDocumentId);
			const documentRelativePath = relativeUrl.slice(
				documentIdFromRequest.length,
			);
			documentUrl = `${this.endpoint}/tinylicious/${encodedDocId}${documentRelativePath}`;
			deltaStorageUrl = `${this.endpoint}/deltas/tinylicious/${encodedDocId}`;
		}

		return {
			endpoints: {
				deltaStorageUrl,
				ordererUrl: this.endpoint,
				storageUrl: `${this.endpoint}/repos/tinylicious`,
			},
			id: finalDocumentId,
			tokens: {},
			type: "fluid",
			url: documentUrl,
		};
	}

	// biome-ignore lint/suspicious/useAwait: interface
	public async getAbsoluteUrl(
		resolvedUrl: IResolvedUrl,
		relativeUrl: string,
	): Promise<string> {
		const documentId = decodeURIComponent(
			resolvedUrl.url.replace(`${this.endpoint}/tinylicious/`, ""),
		);
		/*
		 * The detached container flow will ultimately call getAbsoluteUrl() with the resolved.url produced by
		 * resolve().  The container expects getAbsoluteUrl's return value to be a URL that can then be roundtripped
		 * back through resolve() again, and get the same result again.  So we'll return a "URL" with the same format
		 * described above.
		 */
		return `${documentId}/${relativeUrl}`;
	}
}

/**
 * Creates an insecure URL resolver for testing purposes with localhost port 7070.
 *
 * @beta
 */
export function createInsecureTestUrlResolver(): IUrlResolver {
	return new InsecureUrlResolver();
}

/**
 * Creates a {@link @fluidframework/core-interfaces#IRequest}.
 *
 * @beta
 */
export const createCreateNewRequest = (documentId?: string): IRequest => ({
	url: documentId ?? "",
	headers: {
		[DriverHeader.createNew]: true,
	},
});

/**
 * Creates a {@link @fluidframework/core-interfaces#IRequest} for testing purposes.
 */
export const createTestCreateNewRequest = createCreateNewRequest;
