import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import type { IPhoenixUser } from "../src/contracts.js";
import { InsecurePhoenixTokenProvider } from "../src/tokenProvider.js";

describe("InsecurePhoenixTokenProvider", () => {
	const testKey = "test-secret-key";
	const testUser: IPhoenixUser = {
		id: "user-123",
		name: "Test User",
		email: "test@example.com",
	};

	describe("constructor", () => {
		it("creates provider with user and key", () => {
			const provider = new InsecurePhoenixTokenProvider(testKey, testUser);
			expect(provider.currentUser).toEqual(testUser);
		});

		it("uses default tenant ID when not specified", () => {
			const provider = new InsecurePhoenixTokenProvider(testKey, testUser);
			// Default is "fluid"
			expect(provider.currentUser.id).toBe("user-123");
		});

		it("accepts custom tenant ID", () => {
			const provider = new InsecurePhoenixTokenProvider(
				testKey,
				testUser,
				"custom-tenant",
			);
			expect(provider.currentUser).toEqual(testUser);
		});
	});

	describe("fetchOrdererToken", () => {
		it("returns valid JWT token", async () => {
			const provider = new InsecurePhoenixTokenProvider(testKey, testUser);
			const response = await provider.fetchOrdererToken("tenant1", "doc1");

			expect(response.jwt).toBeDefined();
			expect(typeof response.jwt).toBe("string");
		});

		it("generates token with correct claims", async () => {
			const provider = new InsecurePhoenixTokenProvider(testKey, testUser);
			const response = await provider.fetchOrdererToken("tenant1", "doc1");

			const decoded = jwt.verify(response.jwt, testKey) as Record<
				string,
				unknown
			>;

			expect(decoded.tenantId).toBe("tenant1");
			expect(decoded.documentId).toBe("doc1");
			expect(decoded.user).toEqual(testUser);
			expect(decoded.scopes).toContain("doc:read");
			expect(decoded.scopes).toContain("doc:write");
			expect(decoded.scopes).toContain("summary:write");
		});

		it("generates token with expiration", async () => {
			const provider = new InsecurePhoenixTokenProvider(testKey, testUser);
			const response = await provider.fetchOrdererToken("tenant1", "doc1");

			const decoded = jwt.verify(response.jwt, testKey) as Record<
				string,
				unknown
			>;

			expect(decoded.exp).toBeDefined();
			expect(decoded.iat).toBeDefined();
			expect(Number(decoded.exp)).toBeGreaterThan(Number(decoded.iat));
		});

		it("handles empty document ID", async () => {
			const provider = new InsecurePhoenixTokenProvider(testKey, testUser);
			const response = await provider.fetchOrdererToken("tenant1");

			const decoded = jwt.verify(response.jwt, testKey) as Record<
				string,
				unknown
			>;

			expect(decoded.documentId).toBe("");
		});
	});

	describe("fetchStorageToken", () => {
		it("returns valid JWT token", async () => {
			const provider = new InsecurePhoenixTokenProvider(testKey, testUser);
			const response = await provider.fetchStorageToken("tenant1", "doc1");

			expect(response.jwt).toBeDefined();
			expect(typeof response.jwt).toBe("string");
		});

		it("generates token with correct claims", async () => {
			const provider = new InsecurePhoenixTokenProvider(testKey, testUser);
			const response = await provider.fetchStorageToken("tenant1", "doc1");

			const decoded = jwt.verify(response.jwt, testKey) as Record<
				string,
				unknown
			>;

			expect(decoded.tenantId).toBe("tenant1");
			expect(decoded.documentId).toBe("doc1");
		});
	});

	describe("currentUser", () => {
		it("returns the user passed to constructor", () => {
			const provider = new InsecurePhoenixTokenProvider(testKey, testUser);
			expect(provider.currentUser).toBe(testUser);
		});

		it("includes all user properties", () => {
			const userWithDetails: IPhoenixUser = {
				id: "user-456",
				name: "Detailed User",
				email: "detailed@example.com",
				additionalDetails: {
					role: "admin",
					department: "engineering",
				},
			};

			const provider = new InsecurePhoenixTokenProvider(
				testKey,
				userWithDetails,
			);
			expect(provider.currentUser).toEqual(userWithDetails);
		});
	});

	describe("token uniqueness", () => {
		it("generates different JTI for each token", async () => {
			const provider = new InsecurePhoenixTokenProvider(testKey, testUser);

			const response1 = await provider.fetchOrdererToken("tenant1", "doc1");
			const response2 = await provider.fetchOrdererToken("tenant1", "doc1");

			const decoded1 = jwt.verify(response1.jwt, testKey) as Record<
				string,
				unknown
			>;
			const decoded2 = jwt.verify(response2.jwt, testKey) as Record<
				string,
				unknown
			>;

			expect(decoded1.jti).not.toBe(decoded2.jti);
		});
	});
});
