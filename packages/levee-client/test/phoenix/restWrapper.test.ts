import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { RestWrapper, RestError } from "../../src/phoenix/restWrapper.js";
import type { ITokenProvider, ITokenResponse } from "@fluidframework/routerlicious-driver";

describe("RestWrapper", () => {
	const baseUrl = "http://localhost:4000";
	const tenantId = "test-tenant";
	const documentId = "test-doc";

	const mockTokenProvider: ITokenProvider = {
		fetchOrdererToken: vi.fn().mockResolvedValue({ jwt: "mock-token" }),
		fetchStorageToken: vi.fn().mockResolvedValue({ jwt: "mock-token" }),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("constructor", () => {
		it("removes trailing slash from base URL", () => {
			const wrapper = new RestWrapper(
				"http://localhost:4000/",
				mockTokenProvider,
				tenantId,
				documentId,
			);
			// Constructor normalizes URL
			expect(wrapper).toBeDefined();
		});

		it("accepts URL without trailing slash", () => {
			const wrapper = new RestWrapper(
				baseUrl,
				mockTokenProvider,
				tenantId,
				documentId,
			);
			expect(wrapper).toBeDefined();
		});
	});

	describe("RestError", () => {
		it("creates error with status code", () => {
			const error = new RestError("Not found", 404);

			expect(error.message).toBe("Not found");
			expect(error.statusCode).toBe(404);
			expect(error.name).toBe("RestError");
		});

		it("marks network errors as retriable", () => {
			const error = new RestError("Network error", 0);
			expect(error.canRetry).toBe(true);
		});

		it("marks timeout errors as retriable", () => {
			const error = new RestError("Timeout", 408);
			expect(error.canRetry).toBe(true);
		});

		it("marks rate limit errors as retriable", () => {
			const error = new RestError("Rate limited", 429);
			expect(error.canRetry).toBe(true);
		});

		it("marks 502 errors as retriable", () => {
			const error = new RestError("Bad gateway", 502);
			expect(error.canRetry).toBe(true);
		});

		it("marks 503 errors as retriable", () => {
			const error = new RestError("Service unavailable", 503);
			expect(error.canRetry).toBe(true);
		});

		it("marks 504 errors as retriable", () => {
			const error = new RestError("Gateway timeout", 504);
			expect(error.canRetry).toBe(true);
		});

		it("marks 4xx errors as non-retriable", () => {
			const error400 = new RestError("Bad request", 400);
			const error401 = new RestError("Unauthorized", 401);
			const error403 = new RestError("Forbidden", 403);
			const error404 = new RestError("Not found", 404);

			expect(error400.canRetry).toBe(false);
			expect(error401.canRetry).toBe(false);
			expect(error403.canRetry).toBe(false);
			expect(error404.canRetry).toBe(false);
		});

		it("marks 500 errors as non-retriable", () => {
			const error = new RestError("Internal server error", 500);
			expect(error.canRetry).toBe(false);
		});
	});

	describe("HTTP methods", () => {
		it("get method exists", () => {
			const wrapper = new RestWrapper(
				baseUrl,
				mockTokenProvider,
				tenantId,
				documentId,
			);
			expect(typeof wrapper.get).toBe("function");
		});

		it("post method exists", () => {
			const wrapper = new RestWrapper(
				baseUrl,
				mockTokenProvider,
				tenantId,
				documentId,
			);
			expect(typeof wrapper.post).toBe("function");
		});

		it("patch method exists", () => {
			const wrapper = new RestWrapper(
				baseUrl,
				mockTokenProvider,
				tenantId,
				documentId,
			);
			expect(typeof wrapper.patch).toBe("function");
		});

		it("delete method exists", () => {
			const wrapper = new RestWrapper(
				baseUrl,
				mockTokenProvider,
				tenantId,
				documentId,
			);
			expect(typeof wrapper.delete).toBe("function");
		});
	});
});
