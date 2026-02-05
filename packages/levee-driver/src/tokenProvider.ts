/**
 * Token provider implementations for Levee driver authentication.
 */

import type {
	ITokenProvider,
	ITokenResponse,
} from "@fluidframework/routerlicious-driver";
import { SignJWT } from "jose";
import { v4 as uuid } from "uuid";

import type { LeveeUser } from "./contracts.js";

/**
 * Insecure token provider for development and testing.
 *
 * @remarks
 * This provider generates JWTs locally using a shared secret key.
 * It should ONLY be used for development/testing with a local server.
 * Never use in production environments.
 *
 * @public
 */
export class InsecureLeveeTokenProvider implements ITokenProvider {
	private readonly key: string;
	private readonly user: LeveeUser;
	private readonly tenantId: string;

	/**
	 * Creates a new InsecureLeveeTokenProvider.
	 *
	 * @param key - The shared secret key for signing tokens
	 * @param user - User information to include in the token
	 * @param tenantId - The tenant ID (defaults to "fluid")
	 */
	public constructor(key: string, user: LeveeUser, tenantId = "fluid") {
		this.key = key;
		this.user = user;
		this.tenantId = tenantId;
	}

	/**
	 * Fetches a token for the specified tenant and document.
	 *
	 * @param tenantId - The tenant ID
	 * @param documentId - The document ID
	 * @param refresh - Whether this is a refresh request (optional)
	 * @returns A promise resolving to the token response
	 */
	public async fetchOrdererToken(
		tenantId: string,
		documentId?: string,
		_refresh?: boolean,
	): Promise<ITokenResponse> {
		return {
			jwt: await this.generateToken(tenantId, documentId ?? ""),
		};
	}

	/**
	 * Fetches a token for storage operations.
	 *
	 * @param tenantId - The tenant ID
	 * @param documentId - The document ID
	 * @param refresh - Whether this is a refresh request (optional)
	 * @returns A promise resolving to the token response
	 */
	public async fetchStorageToken(
		tenantId: string,
		documentId: string,
		_refresh?: boolean,
	): Promise<ITokenResponse> {
		return {
			jwt: await this.generateToken(tenantId, documentId),
		};
	}

	/**
	 * Gets the current user associated with this token provider.
	 */
	public get currentUser(): LeveeUser {
		return this.user;
	}

	/**
	 * Generates a JWT token with the specified claims.
	 *
	 * @param tenantId - The tenant ID
	 * @param documentId - The document ID
	 * @returns The signed JWT string
	 */
	private async generateToken(
		tenantId: string,
		documentId: string,
	): Promise<string> {
		const now = Math.floor(Date.now() / 1000);
		const claims = {
			documentId,
			tenantId: tenantId || this.tenantId,
			scopes: ["doc:read", "doc:write", "summary:write"],
			user: this.user,
			ver: "1.0",
			jti: uuid(),
		};

		const secret = new TextEncoder().encode(this.key);

		return new SignJWT(claims)
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt(now)
			.setExpirationTime(now + 3600) // 1 hour expiration
			.sign(secret);
	}
}

/**
 * Token provider that fetches tokens from a remote authentication service.
 *
 * @remarks
 * Use this provider when connecting to a production server that requires
 * server-side token generation.
 *
 * @public
 */
export class RemoteLeveeTokenProvider implements ITokenProvider {
	private readonly tokenEndpoint: string;
	private readonly user: LeveeUser;
	private cachedTokens: Map<string, { token: string; expiresAt: number }>;

	/**
	 * Creates a new RemoteLeveeTokenProvider.
	 *
	 * @param tokenEndpoint - The URL endpoint for fetching tokens
	 * @param user - User information to send with token requests
	 */
	public constructor(tokenEndpoint: string, user: LeveeUser) {
		this.tokenEndpoint = tokenEndpoint;
		this.user = user;
		this.cachedTokens = new Map();
	}

	/**
	 * Fetches a token for orderer operations.
	 */
	public async fetchOrdererToken(
		tenantId: string,
		documentId?: string,
		refresh?: boolean,
	): Promise<ITokenResponse> {
		return this.fetchToken(tenantId, documentId ?? "", "orderer", refresh);
	}

	/**
	 * Fetches a token for storage operations.
	 */
	public async fetchStorageToken(
		tenantId: string,
		documentId: string,
		refresh?: boolean,
	): Promise<ITokenResponse> {
		return this.fetchToken(tenantId, documentId, "storage", refresh);
	}

	/**
	 * Gets the current user associated with this token provider.
	 */
	public get currentUser(): LeveeUser {
		return this.user;
	}

	/**
	 * Fetches a token from the remote endpoint.
	 */
	private async fetchToken(
		tenantId: string,
		documentId: string,
		scope: string,
		refresh?: boolean,
	): Promise<ITokenResponse> {
		const cacheKey = `${tenantId}:${documentId}:${scope}`;

		// Check cache unless refresh is requested
		if (!refresh) {
			const cached = this.cachedTokens.get(cacheKey);
			if (cached && cached.expiresAt > Date.now()) {
				return { jwt: cached.token };
			}
		}

		// Fetch new token
		const response = await fetch(this.tokenEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				tenantId,
				documentId,
				scope,
				user: this.user,
			}),
		});

		if (!response.ok) {
			throw new Error(
				`Failed to fetch token: ${response.status} ${response.statusText}`,
			);
		}

		const data = (await response.json()) as { jwt: string; expiresIn?: number };

		// Cache the token
		const expiresIn = data.expiresIn ?? 3600;
		this.cachedTokens.set(cacheKey, {
			token: data.jwt,
			expiresAt: Date.now() + expiresIn * 1000 - 60000, // Expire 1 min early
		});

		return { jwt: data.jwt };
	}
}
