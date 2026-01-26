/**
 * URL resolver for Levee server.
 */

import type { IRequest } from "@fluidframework/core-interfaces";
import type {
	IResolvedUrl,
	IUrlResolver,
} from "@fluidframework/driver-definitions/internal";

import type { LeveeResolvedUrl } from "./contracts.js";

/**
 * Default tenant ID used when none is specified.
 */
const DEFAULT_TENANT_ID = "fluid";

/**
 * Regex for removing trailing slashes from URLs.
 */
const TRAILING_SLASH_REGEX = /\/$/;

/**
 * Regex for converting levee/phoenix protocols to http.
 */
const PROTOCOL_REGEX = /^(levee|phoenix):/;

/**
 * URL resolver for connecting to a Levee server.
 *
 * @remarks
 * This resolver handles URLs in the following formats:
 * - `levee://host:port/tenantId/documentId`
 * - `phoenix://host:port/tenantId/documentId`
 * - Simple document ID strings (uses configured defaults)
 *
 * @public
 */
export class LeveeUrlResolver implements IUrlResolver {
	private readonly socketUrl: string;
	private readonly httpUrl: string;
	private readonly defaultTenantId: string;

	/**
	 * Creates a new LeveeUrlResolver.
	 *
	 * @param socketUrl - WebSocket URL for Phoenix socket (e.g., ws://localhost:4000/socket)
	 * @param httpUrl - HTTP base URL for REST API (e.g., http://localhost:4000)
	 * @param defaultTenantId - Default tenant ID to use when not specified in URL
	 */
	public constructor(
		socketUrl: string,
		httpUrl: string,
		defaultTenantId = DEFAULT_TENANT_ID,
	) {
		// Ensure socket URL ends with /socket if not already
		this.socketUrl = socketUrl.endsWith("/socket")
			? socketUrl
			: `${socketUrl}/socket`;
		this.httpUrl = httpUrl.replace(TRAILING_SLASH_REGEX, ""); // Remove trailing slash
		this.defaultTenantId = defaultTenantId;
	}

	/**
	 * Resolves a Fluid request URL to a Levee resolved URL.
	 *
	 * @param request - The request containing the URL to resolve
	 * @returns The resolved URL with all connection information
	 */
	public async resolve(request: IRequest): Promise<IResolvedUrl> {
		const { tenantId, documentId } = this.parseUrl(request.url);

		const resolvedUrl: LeveeResolvedUrl = {
			type: "fluid",
			id: documentId,
			url: `${this.httpUrl}/${tenantId}/${documentId}`,
			tenantId,
			documentId,
			socketUrl: this.socketUrl,
			httpUrl: this.httpUrl,
			endpoints: {
				deltaStorageUrl: `${this.httpUrl}/deltas/${tenantId}/${documentId}`,
				storageUrl: `${this.httpUrl}/repos/${tenantId}`,
			},
			tokens: {},
		};

		return resolvedUrl;
	}

	/**
	 * Gets the absolute URL for a resolved URL.
	 *
	 * @param resolvedUrl - The resolved URL
	 * @param relativeUrl - Optional relative path to append
	 * @returns The absolute URL string
	 */
	public async getAbsoluteUrl(
		resolvedUrl: IResolvedUrl,
		relativeUrl: string,
	): Promise<string> {
		const leveeUrl = resolvedUrl as LeveeResolvedUrl;

		if (relativeUrl) {
			return `${leveeUrl.url}/${relativeUrl}`;
		}

		return leveeUrl.url;
	}

	/**
	 * Creates a new document request URL.
	 *
	 * @param tenantId - Optional tenant ID (uses default if not specified)
	 * @returns A request object for creating a new document
	 */
	public createCreateNewRequest(tenantId?: string): IRequest {
		return {
			url: `${this.httpUrl}/${tenantId ?? this.defaultTenantId}`,
			headers: {},
		};
	}

	/**
	 * Creates a request for an existing document.
	 *
	 * @param documentId - The document ID
	 * @param tenantId - Optional tenant ID (uses default if not specified)
	 * @returns A request object for the existing document
	 */
	public createRequestForDocument(
		documentId: string,
		tenantId?: string,
	): IRequest {
		return {
			url: `${this.httpUrl}/${tenantId ?? this.defaultTenantId}/${documentId}`,
			headers: {},
		};
	}

	/**
	 * Parses a URL into tenant ID and document ID components.
	 *
	 * @param url - The URL to parse
	 * @returns Object containing tenantId and documentId
	 */
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: URL parsing handles multiple formats
	private parseUrl(url: string): { tenantId: string; documentId: string } {
		// Handle levee:// or phoenix:// protocol
		if (url.startsWith("levee://") || url.startsWith("phoenix://")) {
			const parsed = new URL(url.replace(PROTOCOL_REGEX, "http:"));
			const pathParts = parsed.pathname.split("/").filter((p) => p.length > 0);

			if (pathParts.length >= 2) {
				return {
					tenantId: pathParts[0] ?? this.defaultTenantId,
					documentId: pathParts[1] ?? "",
				};
			}
			if (pathParts.length === 1) {
				return {
					tenantId: this.defaultTenantId,
					documentId: pathParts[0] ?? "",
				};
			}
		}

		// Handle http:// or https:// URLs
		if (url.startsWith("http://") || url.startsWith("https://")) {
			const parsed = new URL(url);
			const pathParts = parsed.pathname.split("/").filter((p) => p.length > 0);

			if (pathParts.length >= 2) {
				return {
					tenantId: pathParts[0] ?? this.defaultTenantId,
					documentId: pathParts[1] ?? "",
				};
			}
			if (pathParts.length === 1) {
				return {
					tenantId: this.defaultTenantId,
					documentId: pathParts[0] ?? "",
				};
			}
		}

		// Handle plain document ID
		if (!(url.includes("/") || url.includes(":"))) {
			return {
				tenantId: this.defaultTenantId,
				documentId: url,
			};
		}

		// Handle tenant/documentId format
		const parts = url.split("/").filter((p) => p.length > 0);
		if (parts.length >= 2) {
			return {
				tenantId: parts[0] ?? this.defaultTenantId,
				documentId: parts[1] ?? "",
			};
		}
		if (parts.length === 1) {
			return {
				tenantId: this.defaultTenantId,
				documentId: parts[0] ?? "",
			};
		}

		throw new Error(`Unable to parse URL: ${url}`);
	}
}
