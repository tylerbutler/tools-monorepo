import { expect, test } from "@playwright/test";

test.describe("CCL Test Viewer App", () => {
	test("homepage loads successfully", async ({ page }) => {
		await page.goto("/");

		// Check for main heading
		await expect(
			page.getByRole("heading", { name: "CCL Test Suite Viewer" }),
		).toBeVisible();

		// Check for navigation links
		await expect(page.getByRole("button", { name: /home/i })).toBeVisible();
		await expect(
			page.getByRole("button", { name: /browse tests/i }),
		).toBeVisible();
	});

	test("navigation works correctly", async ({ page }) => {
		await page.goto("/");

		// Navigate to browse page
		await page.getByRole("button", { name: /browse tests/i }).click();
		await expect(
			page.getByRole("heading", { name: "Browse Tests" }),
		).toBeVisible();

		// Navigate back to home
		await page.getByRole("button", { name: /home/i }).click();
		await expect(page.getByText(/test suite viewer/i)).toBeVisible();
	});

	test("browse page displays tests", async ({ page }) => {
		await page.goto("/browse");

		// Wait for page to load
		await expect(page.getByText("Loading test data...")).toBeVisible();
		await expect(page.getByText("Loading test data...")).not.toBeVisible({
			timeout: 10000,
		});

		// Check for test cards or empty state
		const testCards = page.locator(
			'[role="button"][aria-label*="View test case"]',
		);
		const emptyState = page.getByText("No tests found");

		await expect(testCards.first().or(emptyState)).toBeVisible();
	});

	test("filtering functionality works", async ({ page }) => {
		await page.goto("/browse");

		// Wait for data to load
		await expect(page.getByText("Loading test data...")).not.toBeVisible({
			timeout: 10000,
		});

		// Check if sidebar is visible or toggle it
		const sidebar = page.getByRole("complementary", {
			name: "Test filters and search",
		});
		const sidebarToggle = page
			.getByRole("button", { name: /filters/i })
			.first();

		if (!(await sidebar.isVisible())) {
			await sidebarToggle.click();
		}

		await expect(sidebar).toBeVisible();

		// Try to use search
		const searchInput = page.getByRole("searchbox", {
			name: "Search through test cases",
		});
		await expect(searchInput).toBeVisible();

		await searchInput.fill("parse");
		// Allow debounce time
		await page.waitForTimeout(300);

		// Check that search affects results (either filters tests or shows no results)
		const resultsText = page.getByText(/\d+ of \d+ tests/);
		await expect(resultsText).toBeVisible();
	});

	test("test detail page works", async ({ page }) => {
		await page.goto("/browse");

		// Wait for data to load
		await expect(page.getByText("Loading test data...")).not.toBeVisible({
			timeout: 10000,
		});

		// Find and click first test card if any exist
		const firstTestCard = page
			.locator('[role="button"][aria-label*="View test case"]')
			.first();

		if (await firstTestCard.isVisible()) {
			await firstTestCard.click();

			// Should navigate to test detail page
			await expect(page.url()).toMatch(/\/test\/.+/);

			// Check for test detail content
			await expect(page.getByText(/input/i)).toBeVisible();
			await expect(page.getByText(/expected/i)).toBeVisible();
		}
	});

	test("responsive design works on mobile", async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("/browse");

		// Wait for data to load
		await expect(page.getByText("Loading test data...")).not.toBeVisible({
			timeout: 10000,
		});

		// Check mobile navigation
		const mobileMenuToggle = page.getByRole("button", {
			name: /open filters|close filters/i,
		});
		await expect(mobileMenuToggle).toBeVisible();

		// Test mobile sidebar toggle
		await mobileMenuToggle.click();
		const sidebar = page.getByRole("complementary", {
			name: "Test filters and search",
		});
		await expect(sidebar).toBeVisible();

		// Close sidebar by clicking overlay
		const overlay = page.locator(".fixed.inset-0.bg-black.bg-opacity-50");
		if (await overlay.isVisible()) {
			await overlay.click();
			await expect(sidebar).not.toBeVisible();
		}
	});

	test("accessibility features work", async ({ page }) => {
		await page.goto("/");

		// Test skip link
		await page.keyboard.press("Tab");
		const skipLink = page.getByText("Skip to main content");
		await expect(skipLink).toBeFocused();

		// Test main content focus
		await skipLink.click();
		const mainContent = page.locator("#main-content");
		await expect(mainContent).toBeFocused();

		// Test keyboard navigation in browse page
		await page.goto("/browse");
		await expect(page.getByText("Loading test data...")).not.toBeVisible({
			timeout: 10000,
		});

		// Navigate using keyboard
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");

		// Check that focusable elements receive proper focus styling
		const focusedElement = page.locator(":focus");
		await expect(focusedElement).toBeVisible();
	});

	test("view mode toggle works", async ({ page }) => {
		await page.goto("/browse");

		// Wait for data to load
		await expect(page.getByText("Loading test data...")).not.toBeVisible({
			timeout: 10000,
		});

		// Find view mode toggle
		const viewToggle = page.getByRole("button", { name: /grid|list/i });
		await expect(viewToggle).toBeVisible();

		// Get initial grid container classes
		const gridContainer = page
			.locator("div")
			.filter({ hasText: /View test case/ })
			.first();
		const initialClasses = await gridContainer.getAttribute("class");

		// Toggle view mode
		await viewToggle.click();

		// Check that classes changed
		const newClasses = await gridContainer.getAttribute("class");
		expect(newClasses).not.toBe(initialClasses);
	});
});
