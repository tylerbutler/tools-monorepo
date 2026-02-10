import {
	type BrowserContext,
	test as base,
	expect,
	type Page,
} from "@playwright/test";

const CONNECTION_TIMEOUT = 15_000;
const PRESENCE_SYNC_TIMEOUT = 10_000;

export interface TestFixtures {
	connectedPage: Page;
	secondUser: {
		context: BrowserContext;
		page: Page;
	};
}

/**
 * Wait for the page to show "connected" status
 */
export async function waitForConnected(page: Page): Promise<void> {
	await expect(page.locator("#status")).toContainText("Connected:", {
		timeout: CONNECTION_TIMEOUT,
	});
}

/**
 * Extract the container ID from the URL hash
 */
export function getContainerIdFromUrl(page: Page): string {
	const hash = new URL(page.url()).hash;
	return hash.replace("#", "");
}

/**
 * Wait for a specific number of users to appear in the focus presence panel
 */
export async function waitForPresenceCount(
	page: Page,
	count: number,
): Promise<void> {
	await expect(async () => {
		const focusItems = page.locator("#focus-content .focus");
		const itemCount = await focusItems.count();
		expect(itemCount).toBe(count);
	}).toPass({
		timeout: PRESENCE_SYNC_TIMEOUT,
	});
}

export const test = base.extend<TestFixtures>({
	/**
	 * Provides a page that's already connected to a new container.
	 * Waits for "connected" status before yielding to test.
	 * Each test gets its own fresh container.
	 */
	connectedPage: async ({ page }, use) => {
		// Navigate to create a new container
		await page.goto("/");

		// Wait for connection to be established
		await waitForConnected(page);

		// Verify container ID is in the URL
		const containerId = getContainerIdFromUrl(page);
		expect(containerId).toBeTruthy();

		await use(page);
	},

	/**
	 * Creates a second browser context with a unique user identity
	 * that joins the same container as the first user.
	 * Note: Currently multi-user tests are skipped due to container loading issues.
	 */
	secondUser: async ({ browser, connectedPage }, use) => {
		// Get the container URL from the first user's page
		const containerUrl = connectedPage.url();

		// Create a new browser context (simulates a different user/session)
		const context = await browser.newContext();
		const page = await context.newPage();

		// Navigate to the same container URL
		await page.goto(containerUrl);

		// Wait for the second user to connect
		await waitForConnected(page);

		await use({ context, page });

		// Cleanup
		await context.close();
	},
});

export { expect };
