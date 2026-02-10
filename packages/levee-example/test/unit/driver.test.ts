/**
 * Unit tests for Levee driver configuration.
 */

import { describe, expect, it } from "vitest";

import { createLeveeDriver } from "../../src/driver.js";

describe("createLeveeDriver", () => {
	it("uses default configuration when no config provided", () => {
		const driver = createLeveeDriver();

		expect(driver.config.httpUrl).toBe("http://localhost:4000");
		expect(driver.config.socketUrl).toBe("ws://localhost:4000/socket");
		expect(driver.config.tenantId).toBe("fluid");
	});

	it("accepts custom configuration", () => {
		const driver = createLeveeDriver({
			httpUrl: "http://custom:5000",
			socketUrl: "ws://custom:5000/socket",
			tenantId: "custom-tenant",
		});

		expect(driver.config.httpUrl).toBe("http://custom:5000");
		expect(driver.config.socketUrl).toBe("ws://custom:5000/socket");
		expect(driver.config.tenantId).toBe("custom-tenant");
	});

	it("creates urlResolver", () => {
		const driver = createLeveeDriver();
		expect(driver.urlResolver).toBeDefined();
	});

	it("creates documentServiceFactory", () => {
		const driver = createLeveeDriver();
		expect(driver.documentServiceFactory).toBeDefined();
	});

	it("creates tokenProvider", () => {
		const driver = createLeveeDriver();
		expect(driver.tokenProvider).toBeDefined();
	});

	describe("createCreateNewRequest", () => {
		it("creates a request with createNew header", () => {
			const driver = createLeveeDriver();
			const request = driver.createCreateNewRequest("my-doc");

			expect(request.url).toBe("fluid/my-doc");
			expect(request.headers?.createNew).toBe(true);
		});

		it("uses custom tenant ID", () => {
			const driver = createLeveeDriver({ tenantId: "custom" });
			const request = driver.createCreateNewRequest("my-doc");

			expect(request.url).toBe("custom/my-doc");
		});
	});

	describe("createLoadExistingRequest", () => {
		it("creates a request without createNew header", () => {
			const driver = createLeveeDriver();
			const request = driver.createLoadExistingRequest("existing-doc");

			expect(request.url).toBe("fluid/existing-doc");
			expect(request.headers?.createNew).toBeUndefined();
		});
	});
});
