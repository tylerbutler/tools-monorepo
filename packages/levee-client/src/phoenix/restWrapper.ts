/**
 * HTTP REST client wrapper for Phoenix server communication.
 */

import type { ITokenProvider } from "@fluidframework/routerlicious-driver";

/**
 * Options for REST requests.
 */
export interface IRestRequestOptions {
	headers?: Record<string, string>;
	timeout?: number;
}

/**
 * REST wrapper for making authenticated HTTP requests to the Levee server.
 *
 * @remarks
 * Handles authentication token injection and automatic retry on 401/403 errors.
 *
 * @public
 */
export class RestWrapper {
	private readonly baseUrl: string;
	private readonly tokenProvider: ITokenProvider;
	private readonly tenantId: string;
	private readonly documentId: string;
	private readonly defaultTimeout: number;

	/**
	 * Creates a new RestWrapper instance.
	 *
	 * @param baseUrl - Base URL for the REST API
	 * @param tokenProvider - Token provider for authentication
	 * @param tenantId - Tenant ID for token generation
	 * @param documentId - Document ID for token generation
	 * @param defaultTimeout - Default request timeout in ms (default: 30000)
	 */
	constructor(
		baseUrl: string,
		tokenProvider: ITokenProvider,
		tenantId: string,
		documentId: string,
		defaultTimeout = 30000,
	) {
		this.baseUrl = baseUrl.replace(/\/$/, "");
		this.tokenProvider = tokenProvider;
		this.tenantId = tenantId;
		this.documentId = documentId;
		this.defaultTimeout = defaultTimeout;
	}

	/**
	 * Makes a GET request.
	 *
	 * @param path - API path (relative to base URL)
	 * @param options - Optional request options
	 * @returns Parsed JSON response
	 */
	public async get<T>(path: string, options?: IRestRequestOptions): Promise<T> {
		return this.request<T>("GET", path, undefined, options);
	}

	/**
	 * Makes a POST request.
	 *
	 * @param path - API path (relative to base URL)
	 * @param body - Request body (will be JSON stringified)
	 * @param options - Optional request options
	 * @returns Parsed JSON response
	 */
	public async post<T>(
		path: string,
		body?: unknown,
		options?: IRestRequestOptions,
	): Promise<T> {
		return this.request<T>("POST", path, body, options);
	}

	/**
	 * Makes a PATCH request.
	 *
	 * @param path - API path (relative to base URL)
	 * @param body - Request body (will be JSON stringified)
	 * @param options - Optional request options
	 * @returns Parsed JSON response
	 */
	public async patch<T>(
		path: string,
		body?: unknown,
		options?: IRestRequestOptions,
	): Promise<T> {
		return this.request<T>("PATCH", path, body, options);
	}

	/**
	 * Makes a DELETE request.
	 *
	 * @param path - API path (relative to base URL)
	 * @param options - Optional request options
	 * @returns Parsed JSON response
	 */
	public async delete<T>(path: string, options?: IRestRequestOptions): Promise<T> {
		return this.request<T>("DELETE", path, undefined, options);
	}

	/**
	 * Makes an authenticated request with automatic token refresh on auth errors.
	 */
	private async request<T>(
		method: string,
		path: string,
		body?: unknown,
		options?: IRestRequestOptions,
		isRetry = false,
	): Promise<T> {
		const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

		// Get fresh token
		const tokenResponse = await this.tokenProvider.fetchStorageToken(
			this.tenantId,
			this.documentId,
			isRetry, // Force refresh on retry
		);

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${tokenResponse.jwt}`,
			...options?.headers,
		};

		const controller = new AbortController();
		const timeout = setTimeout(
			() => controller.abort(),
			options?.timeout ?? this.defaultTimeout,
		);

		try {
			const response = await fetch(url, {
				method,
				headers,
				body: body !== undefined ? JSON.stringify(body) : undefined,
				signal: controller.signal,
			});

			// Handle auth errors with retry
			if ((response.status === 401 || response.status === 403) && !isRetry) {
				return this.request<T>(method, path, body, options, true);
			}

			if (!response.ok) {
				const errorText = await response.text().catch(() => "Unknown error");
				throw new RestError(
					`HTTP ${response.status}: ${response.statusText} - ${errorText}`,
					response.status,
				);
			}

			// Handle empty responses
			const text = await response.text();
			if (!text) {
				return undefined as T;
			}

			return JSON.parse(text) as T;
		} catch (error) {
			if (error instanceof RestError) {
				throw error;
			}

			if (error instanceof Error && error.name === "AbortError") {
				throw new RestError("Request timeout", 408);
			}

			throw new RestError(
				error instanceof Error ? error.message : "Unknown request error",
				0,
			);
		} finally {
			clearTimeout(timeout);
		}
	}
}

/**
 * Error class for REST request failures.
 *
 * @public
 */
export class RestError extends Error {
	/**
	 * HTTP status code (0 for non-HTTP errors).
	 */
	public readonly statusCode: number;

	/**
	 * Whether the error can be retried.
	 */
	public readonly canRetry: boolean;

	constructor(message: string, statusCode: number) {
		super(message);
		this.name = "RestError";
		this.statusCode = statusCode;

		// Determine if error is retriable
		this.canRetry =
			statusCode === 0 || // Network error
			statusCode === 408 || // Timeout
			statusCode === 429 || // Rate limited
			statusCode === 502 || // Bad gateway
			statusCode === 503 || // Service unavailable
			statusCode === 504; // Gateway timeout
	}
}
