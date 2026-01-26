/**
 * Integration tests for DiceRoller container lifecycle.
 *
 * These tests require a running Levee server. Start it with:
 *   pnpm test:integration:up
 *
 * Or run the full integration test suite with:
 *   pnpm test:integration
 */

import { Loader } from "@fluidframework/container-loader/legacy";
import { beforeAll, describe, expect, it } from "vitest";

import {
	DiceRollerContainerCodeDetails,
	DiceRollerContainerFactory,
	getDiceRollerFromContainer,
} from "../../src/containerCode.js";
import { createLeveeDriver } from "../../src/driver.js";

// Server configuration matching docker-compose.yml in levee-driver
const LEVEE_HTTP_URL =
	// biome-ignore lint/style/noProcessEnv: test configuration from environment
	process.env.LEVEE_HTTP_URL ?? "http://localhost:4000";
const LEVEE_SOCKET_URL =
	// biome-ignore lint/style/noProcessEnv: test configuration from environment
	process.env.LEVEE_SOCKET_URL ?? "ws://localhost:4000/socket";
const LEVEE_TENANT_KEY =
	// biome-ignore lint/style/noProcessEnv: test configuration from environment
	process.env.LEVEE_TENANT_KEY ?? "dev-tenant-secret-key";

describe("Container Lifecycle", () => {
	let driver: ReturnType<typeof createLeveeDriver>;
	let loader: Loader;

	beforeAll(() => {
		driver = createLeveeDriver({
			httpUrl: LEVEE_HTTP_URL,
			socketUrl: LEVEE_SOCKET_URL,
			tenantKey: LEVEE_TENANT_KEY,
			user: {
				id: "integration-test-user",
				name: "Integration Test",
			},
		});

		loader = new Loader({
			urlResolver: driver.urlResolver,
			documentServiceFactory: driver.documentServiceFactory,
			codeLoader: {
				load: async () => ({
					module: { fluidExport: DiceRollerContainerFactory },
					details: DiceRollerContainerCodeDetails,
				}),
			},
		});
	});

	// These tests are skipped by default because they require a running server
	// Enable when testing against a live Levee server
	// biome-ignore lint/suspicious/noSkippedTests: requires running Levee server
	describe.skip("Create and Load", () => {
		it("creates a new container", async () => {
			const documentId = `test-create-${Date.now()}`;
			const request = driver.createCreateNewRequest(documentId);

			const container = await loader.createDetachedContainer(
				DiceRollerContainerCodeDetails,
			);
			await container.attach(request);

			expect(container.closed).toBe(false);
			expect(container.attachState).toBe("attached");

			container.dispose();
		});

		it("loads an existing container", async () => {
			// First create a container
			const documentId = `test-load-${Date.now()}`;
			const createRequest = driver.createCreateNewRequest(documentId);
			const container1 = await loader.createDetachedContainer(
				DiceRollerContainerCodeDetails,
			);
			await container1.attach(createRequest);

			// Then load it
			const loadRequest = driver.createLoadExistingRequest(documentId);
			const container2 = await loader.resolve(loadRequest);

			expect(container2.closed).toBe(false);
			expect(container2.attachState).toBe("attached");

			container1.dispose();
			container2.dispose();
		});

		it("gets DiceRoller from container", async () => {
			const documentId = `test-diceroller-${Date.now()}`;
			const request = driver.createCreateNewRequest(documentId);

			const container = await loader.createDetachedContainer(
				DiceRollerContainerCodeDetails,
			);
			await container.attach(request);

			const diceRoller = await getDiceRollerFromContainer(container);
			expect(diceRoller).toBeDefined();
			expect(diceRoller.value).toBe(1); // Initial value

			container.dispose();
		});
	});

	// biome-ignore lint/suspicious/noSkippedTests: requires running Levee server
	describe.skip("Collaborative Sync", () => {
		it("synchronizes dice rolls between clients", async () => {
			const documentId = `test-sync-${Date.now()}`;

			// Create first client
			const createRequest = driver.createCreateNewRequest(documentId);
			const container1 = await loader.createDetachedContainer(
				DiceRollerContainerCodeDetails,
			);
			await container1.attach(createRequest);
			const diceRoller1 = await getDiceRollerFromContainer(container1);

			// Create second client that loads the same document
			const loadRequest = driver.createLoadExistingRequest(documentId);
			const container2 = await loader.resolve(loadRequest);
			const diceRoller2 = await getDiceRollerFromContainer(container2);

			// Both should start with the same value
			expect(diceRoller1.value).toBe(diceRoller2.value);

			// Roll on client 1
			diceRoller1.roll();

			// Wait for sync
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Client 2 should see the same value
			expect(diceRoller2.value).toBe(diceRoller1.value);

			container1.dispose();
			container2.dispose();
		});
	});
});

describe("Driver Configuration", () => {
	it("creates driver with test configuration", () => {
		const driver = createLeveeDriver({
			httpUrl: LEVEE_HTTP_URL,
			socketUrl: LEVEE_SOCKET_URL,
			tenantKey: LEVEE_TENANT_KEY,
		});

		expect(driver.config.httpUrl).toBe(LEVEE_HTTP_URL);
		expect(driver.config.socketUrl).toBe(LEVEE_SOCKET_URL);
	});
});
