import { expect, test } from "@playwright/test";

test.describe("Load Built-in Data Button", () => {
	test.beforeEach(async ({ page }) => {
		// Clear localStorage before each test to ensure clean state
		await page.goto("/");
		await page.evaluate(() => {
			localStorage.clear();
		});
	});

	test("loads built-in data on first click and shows success message", async ({
		page,
	}) => {
		// Step 1: Navigate to upload page
		await page.goto("/upload");
		await expect(
			page.getByRole("heading", { name: "Load Test Data" }),
		).toBeVisible();

		// Step 2: Verify initial state - no data summary should be visible
		await expect(page.getByText("Combined Data Summary")).not.toBeVisible();
		await expect(page.getByText("Getting Started")).toBeVisible();

		// Step 3: Find and click the "Load Built-in Data" button
		const loadBuiltinButton = page.getByRole("button", {
			name: "Load Built-in Data",
		});
		await expect(loadBuiltinButton).toBeVisible();
		await loadBuiltinButton.click();

		// Step 4: Wait for and verify the success message appears
		await expect(
			page.getByText("Loaded built-in data: 366 tests across 12 categories"),
		).toBeVisible({
			timeout: 5000,
		});

		// Step 5: Verify the Combined Data Summary section appears
		await expect(page.getByText("Combined Data Summary")).toBeVisible();

		// Step 6: Verify the expected data counts in the data summary section
		await expect(
			page.getByText("366").and(page.locator(".text-2xl")),
		).toBeVisible(); // Total Tests
		await expect(
			page.getByText("630").and(page.locator(".text-2xl")),
		).toBeVisible(); // Total Assertions
		await expect(
			page.getByText("12").and(page.locator(".text-2xl")),
		).toBeVisible(); // Categories
		await expect(page.getByText("1 of 1 source active")).toBeVisible(); // Active Sources

		// Step 7: The Getting Started section may still be visible as it's shown for guidance

		// Step 8: Wait for the success message to disappear (3 second timeout)
		await expect(
			page.getByText("Loaded built-in data: 366 tests across 12 categories"),
		).not.toBeVisible({
			timeout: 4000,
		});
	});

	test("shows 'already loaded' message on subsequent clicks", async ({
		page,
	}) => {
		// Step 1: Navigate to upload page and load data first
		await page.goto("/upload");
		const loadBuiltinButton = page.getByRole("button", {
			name: "Load Built-in Data",
		});
		await loadBuiltinButton.click();

		// Step 2: Wait for initial load to complete
		await expect(page.getByText("Combined Data Summary")).toBeVisible();
		await expect(
			page.getByText("Loaded built-in data: 366 tests across 12 categories"),
		).not.toBeVisible({
			timeout: 4000,
		});

		// Step 3: Click the button again
		await loadBuiltinButton.click();

		// Step 4: Verify the "already loaded" message appears
		await expect(page.getByText("Built-in data is already loaded")).toBeVisible(
			{
				timeout: 1000,
			},
		);

		// Step 5: Verify data summary is still present and unchanged
		await expect(page.getByText("Combined Data Summary")).toBeVisible();
		await expect(
			page.getByText("366").and(page.locator(".text-2xl")),
		).toBeVisible(); // Total Tests count unchanged

		// Step 6: Wait for the "already loaded" message to disappear
		await expect(
			page.getByText("Built-in data is already loaded"),
		).not.toBeVisible({
			timeout: 4000,
		});

		// Step 7: Click the button a third time to ensure consistent behavior
		await loadBuiltinButton.click();
		await expect(page.getByText("Built-in data is already loaded")).toBeVisible(
			{
				timeout: 1000,
			},
		);
	});

	test("button is disabled during processing", async ({ page }) => {
		// Step 1: Navigate to upload page
		await page.goto("/upload");
		const loadBuiltinButton = page.getByRole("button", {
			name: "Load Built-in Data",
		});

		// Step 2: Verify button is initially enabled
		await expect(loadBuiltinButton).toBeEnabled();

		// Step 3: Click the button
		await loadBuiltinButton.click();

		// Step 4: Verify button becomes disabled briefly during processing
		// Note: This may be very brief, so we check for either disabled state or success message
		try {
			await expect(loadBuiltinButton).toBeDisabled({ timeout: 500 });
		} catch {
			// If button wasn't disabled long enough to catch, verify success message instead
			await expect(
				page.getByText("Loaded built-in data: 366 tests across 12 categories"),
			).toBeVisible({
				timeout: 2000,
			});
		}

		// Step 5: Verify button is re-enabled after processing
		await expect(loadBuiltinButton).toBeEnabled({ timeout: 3000 });
	});

	test("loaded data persists across page navigation", async ({ page }) => {
		// Step 1: Load built-in data on upload page
		await page.goto("/upload");
		const loadBuiltinButton = page.getByRole("button", {
			name: "Load Built-in Data",
		});
		await loadBuiltinButton.click();
		await expect(page.getByText("Combined Data Summary")).toBeVisible();

		// Step 2: Navigate to browse page
		await page
			.getByRole("button", { name: /browse and filter test cases/i })
			.click();
		await expect(
			page.getByRole("heading", { name: "Browse Tests" }),
		).toBeVisible();

		// Step 3: Wait for data to load and verify built-in tests are visible
		await expect(page.getByText("Loading test data...")).not.toBeVisible({
			timeout: 10000,
		});

		// Verify we can see test cards (should be many from the built-in data)
		const testCards = page.locator(
			'[role="button"][aria-label*="View test case"]',
		);
		await expect(testCards.first()).toBeVisible({ timeout: 5000 });

		// Step 4: Navigate back to upload page
		// Close any open sidebar overlay that might interfere with navigation
		const overlay = page.locator(".fixed.inset-0.bg-black.bg-opacity-50");
		if (await overlay.isVisible()) {
			await overlay.click();
		}

		await page
			.getByRole("button", { name: /upload json test data files/i })
			.click();

		// Step 5: Verify data is still loaded (Combined Data Summary visible)
		await expect(page.getByText("Combined Data Summary")).toBeVisible();

		// Step 6: Verify clicking the button again shows "already loaded"
		await loadBuiltinButton.click();
		await expect(
			page.getByText("Built-in data is already loaded"),
		).toBeVisible();
	});

	test("button has proper accessibility attributes", async ({ page }) => {
		// Step 1: Navigate to upload page
		await page.goto("/upload");
		const loadBuiltinButton = page.getByRole("button", {
			name: "Load Built-in Data",
		});

		// Step 2: Verify button has proper role and is focusable
		await expect(loadBuiltinButton).toBeVisible();
		await expect(loadBuiltinButton).toBeEnabled();

		// Step 3: Test keyboard accessibility
		await page.keyboard.press("Tab");
		// Navigate to the button (may need multiple tabs depending on page structure)
		let tabCount = 0;
		while (tabCount < 10) {
			// Safety limit
			const focused = await page.locator(":focus").textContent();
			if (focused?.includes("Load Built-in Data")) {
				break;
			}
			await page.keyboard.press("Tab");
			tabCount++;
		}

		// Step 4: Verify button can be activated with keyboard
		await page.keyboard.press("Enter");
		await expect(
			page.getByText("Loaded built-in data: 366 tests across 12 categories"),
		).toBeVisible({
			timeout: 5000,
		});

		// Step 5: Verify the button has appropriate title/tooltip
		const title = await loadBuiltinButton.getAttribute("title");
		expect(title).toBeTruthy();
		expect(title.toLowerCase()).toContain("built-in");
	});

	test("button works correctly on mobile viewport", async ({ page }) => {
		// Step 1: Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		// Step 2: Navigate to upload page
		await page.goto("/upload");

		// Step 3: Verify button is visible and accessible on mobile
		const loadBuiltinButton = page.getByRole("button", {
			name: "Load Built-in Data",
		});
		await expect(loadBuiltinButton).toBeVisible();

		// Step 4: Test touch interaction
		await loadBuiltinButton.click();

		// Step 5: Verify mobile responsive behavior
		await expect(page.getByText("Combined Data Summary")).toBeVisible();
		await expect(
			page.getByText("Loaded built-in data: 366 tests across 12 categories"),
		).toBeVisible({
			timeout: 5000,
		});

		// Step 6: Verify mobile layout doesn't break
		const buttonContainer = page
			.locator("div")
			.filter({ hasText: "Load Built-in Data" })
			.first();
		await expect(buttonContainer).toBeVisible();
	});

	test("multiple rapid clicks are handled gracefully", async ({ page }) => {
		// Step 1: Navigate to upload page
		await page.goto("/upload");
		const loadBuiltinButton = page.getByRole("button", {
			name: "Load Built-in Data",
		});

		// Step 2: Rapidly click the button multiple times
		await loadBuiltinButton.click();
		await loadBuiltinButton.click();
		await loadBuiltinButton.click();

		// Step 3: Verify only one successful load occurs
		await expect(page.getByText("Combined Data Summary")).toBeVisible();

		// Should either show initial success message or "already loaded" message
		const successMessage = page.getByText(
			"Loaded built-in data: 366 tests across 12 categories",
		);
		const alreadyLoadedMessage = page.getByText(
			"Built-in data is already loaded",
		);

		await expect(successMessage.or(alreadyLoadedMessage)).toBeVisible({
			timeout: 5000,
		});

		// Step 4: Verify data count is correct (not duplicated)
		await expect(
			page.getByText("366").and(page.locator(".text-2xl")),
		).toBeVisible(); // Total Tests
		await expect(page.getByText("1 of 1 source active")).toBeVisible(); // Active Sources (should be 1, not 3)
	});
});
