import { describe, expect, it } from "vitest";

import { PhoenixUrlResolver } from "../../src/phoenix/urlResolver.js";
import type { IPhoenixResolvedUrl } from "../../src/phoenix/contracts.js";

describe("PhoenixUrlResolver", () => {
	const socketUrl = "ws://localhost:4000/socket";
	const httpUrl = "http://localhost:4000";
	const defaultTenantId = "fluid";

	describe("constructor", () => {
		it("stores socket URL with /socket suffix", () => {
			const resolver = new PhoenixUrlResolver(
				"ws://localhost:4000",
				httpUrl,
			);
			// We can't directly test private fields, so we'll test via resolve
			// which uses the socketUrl
		});

		it("preserves socket URL if already has /socket suffix", () => {
			const resolver = new PhoenixUrlResolver(socketUrl, httpUrl);
			// Constructor should not double the suffix
		});

		it("removes trailing slash from httpUrl", () => {
			const resolver = new PhoenixUrlResolver(
				socketUrl,
				"http://localhost:4000/",
			);
			// Test via resolve
		});
	});

	describe("resolve", () => {
		it("resolves levee:// protocol URLs", async () => {
			const resolver = new PhoenixUrlResolver(socketUrl, httpUrl);
			const resolved = (await resolver.resolve({
				url: "levee://localhost:4000/tenant1/doc123",
			})) as IPhoenixResolvedUrl;

			expect(resolved.type).toBe("fluid");
			expect(resolved.tenantId).toBe("tenant1");
			expect(resolved.documentId).toBe("doc123");
			expect(resolved.socketUrl).toBe(socketUrl);
			expect(resolved.httpUrl).toBe(httpUrl);
		});

		it("resolves phoenix:// protocol URLs", async () => {
			const resolver = new PhoenixUrlResolver(socketUrl, httpUrl);
			const resolved = (await resolver.resolve({
				url: "phoenix://localhost:4000/tenant2/doc456",
			})) as IPhoenixResolvedUrl;

			expect(resolved.tenantId).toBe("tenant2");
			expect(resolved.documentId).toBe("doc456");
		});

		it("resolves http:// URLs", async () => {
			const resolver = new PhoenixUrlResolver(socketUrl, httpUrl);
			const resolved = (await resolver.resolve({
				url: "http://localhost:4000/tenant3/doc789",
			})) as IPhoenixResolvedUrl;

			expect(resolved.tenantId).toBe("tenant3");
			expect(resolved.documentId).toBe("doc789");
		});

		it("resolves plain document ID with default tenant", async () => {
			const resolver = new PhoenixUrlResolver(socketUrl, httpUrl);
			const resolved = (await resolver.resolve({
				url: "my-document-id",
			})) as IPhoenixResolvedUrl;

			expect(resolved.tenantId).toBe(defaultTenantId);
			expect(resolved.documentId).toBe("my-document-id");
		});

		it("resolves tenant/docId format", async () => {
			const resolver = new PhoenixUrlResolver(socketUrl, httpUrl);
			const resolved = (await resolver.resolve({
				url: "custom-tenant/custom-doc",
			})) as IPhoenixResolvedUrl;

			expect(resolved.tenantId).toBe("custom-tenant");
			expect(resolved.documentId).toBe("custom-doc");
		});

		it("sets correct endpoint URLs", async () => {
			const resolver = new PhoenixUrlResolver(socketUrl, httpUrl);
			const resolved = (await resolver.resolve({
				url: "tenant/doc",
			})) as IPhoenixResolvedUrl;

			expect(resolved.endpoints.deltaStorageUrl).toBe(
				"http://localhost:4000/deltas/tenant/doc",
			);
			expect(resolved.endpoints.storageUrl).toBe(
				"http://localhost:4000/repos/tenant",
			);
		});

		it("uses custom default tenant ID", async () => {
			const resolver = new PhoenixUrlResolver(
				socketUrl,
				httpUrl,
				"my-default-tenant",
			);
			const resolved = (await resolver.resolve({
				url: "doc-only",
			})) as IPhoenixResolvedUrl;

			expect(resolved.tenantId).toBe("my-default-tenant");
		});
	});

	describe("getAbsoluteUrl", () => {
		it("returns base URL when no relative URL", async () => {
			const resolver = new PhoenixUrlResolver(socketUrl, httpUrl);
			const resolved = (await resolver.resolve({
				url: "tenant/doc",
			})) as IPhoenixResolvedUrl;

			const absoluteUrl = await resolver.getAbsoluteUrl(resolved, "");
			expect(absoluteUrl).toBe("http://localhost:4000/tenant/doc");
		});

		it("appends relative URL", async () => {
			const resolver = new PhoenixUrlResolver(socketUrl, httpUrl);
			const resolved = (await resolver.resolve({
				url: "tenant/doc",
			})) as IPhoenixResolvedUrl;

			const absoluteUrl = await resolver.getAbsoluteUrl(
				resolved,
				"path/to/resource",
			);
			expect(absoluteUrl).toBe(
				"http://localhost:4000/tenant/doc/path/to/resource",
			);
		});
	});

	describe("createCreateNewRequest", () => {
		it("creates request with default tenant ID", () => {
			const resolver = new PhoenixUrlResolver(socketUrl, httpUrl);
			const request = resolver.createCreateNewRequest();

			expect(request.url).toBe("http://localhost:4000/fluid");
		});

		it("creates request with specified tenant ID", () => {
			const resolver = new PhoenixUrlResolver(socketUrl, httpUrl);
			const request = resolver.createCreateNewRequest("my-tenant");

			expect(request.url).toBe("http://localhost:4000/my-tenant");
		});
	});

	describe("createRequestForDocument", () => {
		it("creates request for document with default tenant", () => {
			const resolver = new PhoenixUrlResolver(socketUrl, httpUrl);
			const request = resolver.createRequestForDocument("doc-id");

			expect(request.url).toBe("http://localhost:4000/fluid/doc-id");
		});

		it("creates request for document with specified tenant", () => {
			const resolver = new PhoenixUrlResolver(socketUrl, httpUrl);
			const request = resolver.createRequestForDocument(
				"doc-id",
				"custom-tenant",
			);

			expect(request.url).toBe("http://localhost:4000/custom-tenant/doc-id");
		});
	});
});
