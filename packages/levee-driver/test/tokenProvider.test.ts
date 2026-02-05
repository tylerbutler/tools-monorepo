import { jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import type { LeveeUser } from "../src/contracts.js";
import { InsecureLeveeTokenProvider } from "../src/tokenProvider.js";

const verifyToken = async (
	token: string,
	key: string,
): Promise<Record<string, unknown>> => {
	const secret = new TextEncoder().encode(key);
	const { payload } = await jwtVerify(token, secret);
	return payload as Record<string, unknown>;
};

describe("InsecureLeveeTokenProvider", () => {
	const testKey = "test-secret-key";
	const testUser: LeveeUser = {
		id: "user-123",
		name: "Test User",
		email: "test@example.com",
	};

	describe("constructor", () => {
		it("creates provider with user and key", () => {
			const provider = new InsecureLeveeTokenProvider(testKey, testUser);
			expect(provider.currentUser).toEqual(testUser);
		});

		it("uses default tenant ID when not specified", () => {
			const provider = new InsecureLeveeTokenProvider(testKey, testUser);
			// Default is "fluid"
			expect(provider.currentUser.id).toBe("user-123");
		});

		it("accepts custom tenant ID", () => {
			const provider = new InsecureLeveeTokenProvider(
				testKey,
				testUser,
				"custom-tenant",
			);
			expect(provider.currentUser).toEqual(testUser);
		});
	});

	describe("fetchOrdererToken", () => {
		it("returns valid JWT token", async () => {
			const provider = new InsecureLeveeTokenProvider(testKey, testUser);
			const response = await provider.fetchOrdererToken("tenant1", "doc1");

			expect(response.jwt).toBeDefined();
			expect(typeof response.jwt).toBe("string");
		});

		it("generates token with correct claims", async () => {
			const provider = new InsecureLeveeTokenProvider(testKey, testUser);
			const response = await provider.fetchOrdererToken("tenant1", "doc1");

			const decoded = await verifyToken(response.jwt, testKey);

			expect(decoded.tenantId).toBe("tenant1");
			expect(decoded.documentId).toBe("doc1");
			expect(decoded.user).toEqual(testUser);
			expect(decoded.scopes).toContain("doc:read");
			expect(decoded.scopes).toContain("doc:write");
			expect(decoded.scopes).toContain("summary:write");
		});

		it("generates token with expiration", async () => {
			const provider = new InsecureLeveeTokenProvider(testKey, testUser);
			const response = await provider.fetchOrdererToken("tenant1", "doc1");

			const decoded = await verifyToken(response.jwt, testKey);

			expect(decoded.exp).toBeDefined();
			expect(decoded.iat).toBeDefined();
			expect(Number(decoded.exp)).toBeGreaterThan(Number(decoded.iat));
		});

		it("handles empty document ID", async () => {
			const provider = new InsecureLeveeTokenProvider(testKey, testUser);
			const response = await provider.fetchOrdererToken("tenant1");

			const decoded = await verifyToken(response.jwt, testKey);

			expect(decoded.documentId).toBe("");
		});
	});

	describe("fetchStorageToken", () => {
		it("returns valid JWT token", async () => {
			const provider = new InsecureLeveeTokenProvider(testKey, testUser);
			const response = await provider.fetchStorageToken("tenant1", "doc1");

			expect(response.jwt).toBeDefined();
			expect(typeof response.jwt).toBe("string");
		});

		it("generates token with correct claims", async () => {
			const provider = new InsecureLeveeTokenProvider(testKey, testUser);
			const response = await provider.fetchStorageToken("tenant1", "doc1");

			const decoded = await verifyToken(response.jwt, testKey);

			expect(decoded.tenantId).toBe("tenant1");
			expect(decoded.documentId).toBe("doc1");
		});
	});

	describe("currentUser", () => {
		it("returns the user passed to constructor", () => {
			const provider = new InsecureLeveeTokenProvider(testKey, testUser);
			expect(provider.currentUser).toBe(testUser);
		});

		it("includes all user properties", () => {
			const userWithDetails: LeveeUser = {
				id: "user-456",
				name: "Detailed User",
				email: "detailed@example.com",
				additionalDetails: {
					role: "admin",
					department: "engineering",
				},
			};

			const provider = new InsecureLeveeTokenProvider(testKey, userWithDetails);
			expect(provider.currentUser).toEqual(userWithDetails);
		});
	});

	describe("token uniqueness", () => {
		it("generates different JTI for each token", async () => {
			const provider = new InsecureLeveeTokenProvider(testKey, testUser);

			const response1 = await provider.fetchOrdererToken("tenant1", "doc1");
			const response2 = await provider.fetchOrdererToken("tenant1", "doc1");

			const decoded1 = await verifyToken(response1.jwt, testKey);
			const decoded2 = await verifyToken(response2.jwt, testKey);

			expect(decoded1.jti).not.toBe(decoded2.jti);
		});
	});
});
