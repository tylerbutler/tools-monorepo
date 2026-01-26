/**
 * Integration tests for Levee server connection.
 *
 * These tests require a running Levee server. Start it with:
 *   docker compose up -d
 *
 * Or run the full integration test suite with:
 *   pnpm test:integration:ci
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { LeveeResolvedUrl } from "../../src/contracts.js";
import { LeveeDocumentServiceFactory } from "../../src/leveeDocumentServiceFactory.js";
import { InsecureLeveeTokenProvider } from "../../src/tokenProvider.js";
import { LeveeUrlResolver } from "../../src/urlResolver.js";

// Server configuration matching docker-compose.yml
const LEVEE_HTTP_URL =
	// biome-ignore lint/style/noProcessEnv: test configuration from environment
	process.env.LEVEE_HTTP_URL ?? "http://localhost:4000";
const LEVEE_SOCKET_URL =
	// biome-ignore lint/style/noProcessEnv: test configuration from environment
	process.env.LEVEE_SOCKET_URL ?? "ws://localhost:4000/socket";
const LEVEE_TENANT_KEY =
	// biome-ignore lint/style/noProcessEnv: test configuration from environment
	process.env.LEVEE_TENANT_KEY ?? "dev-tenant-secret-key";

describe("Levee Server Integration", () => {
	let urlResolver: LeveeUrlResolver;
	let factory: LeveeDocumentServiceFactory;
	let tokenProvider: InsecureLeveeTokenProvider;

	beforeAll(() => {
		tokenProvider = new InsecureLeveeTokenProvider(LEVEE_TENANT_KEY, {
			id: "integration-test-user",
			name: "Integration Test",
		});
		urlResolver = new LeveeUrlResolver(LEVEE_SOCKET_URL, LEVEE_HTTP_URL);
		factory = new LeveeDocumentServiceFactory(tokenProvider);
	});

	describe("URL Resolution", () => {
		it("resolves a simple document ID", async () => {
			const resolved = (await urlResolver.resolve({
				url: "test-document-id",
			})) as LeveeResolvedUrl;

			expect(resolved.type).toBe("fluid");
			expect(resolved.tenantId).toBe("fluid");
			expect(resolved.documentId).toBe("test-document-id");
			expect(resolved.socketUrl).toBe(LEVEE_SOCKET_URL);
			expect(resolved.httpUrl).toBe(LEVEE_HTTP_URL);
		});

		it("resolves tenant/document format", async () => {
			const resolved = (await urlResolver.resolve({
				url: "my-tenant/my-document",
			})) as LeveeResolvedUrl;

			expect(resolved.tenantId).toBe("my-tenant");
			expect(resolved.documentId).toBe("my-document");
		});

		it("creates proper endpoint URLs", async () => {
			const resolved = (await urlResolver.resolve({
				url: "fluid/test-doc",
			})) as LeveeResolvedUrl;

			expect(resolved.endpoints.deltaStorageUrl).toBe(
				`${LEVEE_HTTP_URL}/deltas/fluid/test-doc`,
			);
			expect(resolved.endpoints.storageUrl).toBe(
				`${LEVEE_HTTP_URL}/repos/fluid`,
			);
		});
	});

	describe("Document Service Factory", () => {
		it("creates a document service from resolved URL", async () => {
			const resolved = await urlResolver.resolve({
				url: "fluid/integration-test-doc",
			});

			const service = await factory.createDocumentService(resolved);

			expect(service).toBeDefined();
			expect(service.resolvedUrl).toBeDefined();
			expect((service.resolvedUrl as LeveeResolvedUrl).documentId).toBe(
				"integration-test-doc",
			);
		});
	});

	describe("Token Provider", () => {
		it("generates valid tokens", async () => {
			const ordererToken = await tokenProvider.fetchOrdererToken(
				"fluid",
				"test-doc",
			);
			expect(ordererToken.jwt).toBeDefined();
			expect(typeof ordererToken.jwt).toBe("string");
			expect(ordererToken.jwt.split(".")).toHaveLength(3); // JWT format

			const storageToken = await tokenProvider.fetchStorageToken(
				"fluid",
				"test-doc",
			);
			expect(storageToken.jwt).toBeDefined();
		});
	});

	// Uncomment these tests when Levee server endpoints are implemented
	/*
	describe("Server Health", () => {
		it("health endpoint responds", async () => {
			const response = await fetch(`${LEVEE_HTTP_URL}/health`);
			expect(response.ok).toBe(true);
		});
	});

	describe("Storage Service", () => {
		it("connects to storage", async () => {
			const resolved = await urlResolver.resolve({ url: "fluid/storage-test" });
			const service = await factory.createDocumentService(resolved);
			const storage = await service.connectToStorage();

			expect(storage).toBeDefined();
		});
	});

	describe("Delta Connection", () => {
		it("establishes WebSocket connection", async () => {
			const resolved = await urlResolver.resolve({ url: "fluid/delta-test" });
			const service = await factory.createDocumentService(resolved);

			const client = {
				mode: "write" as const,
				details: { capabilities: { interactive: true } },
				permission: [],
				user: { id: "test-user" },
				scopes: ["doc:read", "doc:write"],
			};

			const connection = await service.connectToDeltaStream(client);

			expect(connection).toBeDefined();
			expect(connection.clientId).toBeDefined();

			connection.dispose();
		});
	});
	*/
});

// biome-ignore lint/suspicious/noSkippedTests: placeholder for future tests
describe.skip("Full Container Lifecycle", () => {
	// These tests require full Fluid Framework container support
	// Enable once server implementation is complete

	it.todo("creates a new container");
	it.todo("loads an existing container");
	it.todo("synchronizes changes between clients");
});
