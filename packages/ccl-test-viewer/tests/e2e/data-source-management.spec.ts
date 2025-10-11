import { expect, test } from "@playwright/test";

test.describe("Data Source Management UI", () => {
	test.beforeEach(async ({ page }) => {
		// Clear localStorage before each test to ensure clean state
		await page.goto("/");
		await page.evaluate(() => {
			localStorage.clear();
		});
	});

	test("shows empty state when no data sources are loaded", async ({
		page,
	}) => {
		// Navigate to data management page
		await page.goto("/data");

		// Verify page title and heading
		await expect(
			page.getByRole("heading", { name: "Data Source Management" }),
		).toBeVisible();

		// Verify empty state is displayed
		await expect(page.getByText("No Data Sources")).toBeVisible();
		await expect(
			page.getByText("Load built-in data or add new sources to get started"),
		).toBeVisible();

		// Verify empty state icon is visible
		const emptyStateIcon = page.locator(".mx-auto.mb-4.opacity-50");
		await expect(emptyStateIcon).toBeVisible();

		// Verify load built-in data button is present
		await expect(
			page.getByRole("button", { name: "Load Built-in Data" }),
		).toBeVisible();

		// Verify combined data summary is not visible when empty
		await expect(page.getByText("Combined Data Summary")).not.toBeVisible();
	});

	test("loads built-in data and displays data source correctly", async ({
		page,
	}) => {
		// Navigate to data management page
		await page.goto("/data");

		// Click Load Built-in Data button
		const loadBuiltinButton = page.getByRole("button", {
			name: "Load Built-in Data",
		});
		await loadBuiltinButton.click();

		// Wait for success message
		await expect(
			page.getByText("Loaded built-in data: 366 tests across 12 categories"),
		).toBeVisible({ timeout: 5000 });

		// Verify data source appears in the list
		await expect(page.getByText("Built-in Test Data")).toBeVisible();
		await expect(page.getByText("Built-in", { exact: false })).toBeVisible();

		// Verify data source metadata
		await expect(page.getByText("366 tests")).toBeVisible();
		await expect(page.getByText("12 categories")).toBeVisible();

		// Verify toggle switch is active (source is enabled by default)
		const toggleButton = page.getByRole("button", {
			name: "Deactivate source",
		});
		await expect(toggleButton).toBeVisible();

		// Verify no delete button for built-in data (protected)
		const deleteButton = page.getByRole("button", {
			name: "Remove data source",
		});
		await expect(deleteButton).not.toBeVisible();

		// Verify combined data summary appears
		await expect(page.getByText("Combined Data Summary")).toBeVisible();
		await expect(
			page.getByText("366").and(page.locator(".text-2xl")),
		).toBeVisible();
		await expect(
			page.getByText("630").and(page.locator(".text-2xl")),
		).toBeVisible();
		await expect(
			page.getByText("12").and(page.locator(".text-2xl")),
		).toBeVisible();
		await expect(
			page.getByText("1").and(page.locator(".text-2xl")),
		).toBeVisible();
		await expect(page.getByText("1 of 1 source active")).toBeVisible();
	});

	test("can toggle data source active/inactive state", async ({ page }) => {
		// Navigate and load built-in data
		await page.goto("/data");
		await page.getByRole("button", { name: "Load Built-in Data" }).click();
		await expect(page.getByText("Built-in Test Data")).toBeVisible();

		// Initially source should be active
		const toggleButton = page.getByRole("button", {
			name: "Deactivate source",
		});
		await expect(toggleButton).toBeVisible();

		// Verify combined stats show 1 active source
		await expect(page.getByText("1 of 1 source active")).toBeVisible();
		await expect(
			page.getByText("1").and(page.locator(".text-2xl")),
		).toBeVisible();

		// Toggle source to inactive
		await toggleButton.click();

		// Verify toggle button changes to "Activate source"
		const activateButton = page.getByRole("button", {
			name: "Activate source",
		});
		await expect(activateButton).toBeVisible();

		// Verify inactive badge appears
		await expect(page.getByText("inactive", { exact: false })).toBeVisible();

		// Verify combined stats show 0 active sources
		await expect(page.getByText("0 of 1 source active")).toBeVisible();
		await expect(
			page.getByText("0").and(page.locator(".text-2xl")),
		).toBeVisible();

		// Toggle back to active
		await activateButton.click();

		// Verify source is active again
		await expect(
			page.getByRole("button", { name: "Deactivate source" }),
		).toBeVisible();
		await expect(page.getByText("1 of 1 source active")).toBeVisible();
		await expect(
			page.getByText("1").and(page.locator(".text-2xl")),
		).toBeVisible();
	});

	test("clear all button works correctly", async ({ page }) => {
		// Navigate and load built-in data
		await page.goto("/data");
		await page.getByRole("button", { name: "Load Built-in Data" }).click();
		await expect(page.getByText("Built-in Test Data")).toBeVisible();

		// Click Clear All button
		const clearAllButton = page.getByRole("button", { name: "Clear All" });
		await clearAllButton.click();

		// Wait for clear message
		await expect(
			page.getByText("All test data cleared successfully"),
		).toBeVisible();

		// Verify data source is removed and empty state returns
		await expect(page.getByText("No Data Sources")).toBeVisible();
		await expect(
			page.getByText("Load built-in data or add new sources to get started"),
		).toBeVisible();

		// Verify combined data summary is hidden
		await expect(page.getByText("Combined Data Summary")).not.toBeVisible();
	});

	test("page layout and structure is correct", async ({ page }) => {
		await page.goto("/data");

		// Verify page title in head (note: the layout updates the title dynamically)
		await expect(page).toHaveTitle(/Data.*Management.*CCL Test Suite Viewer/);

		// Verify main sections are present in correct order
		await expect(
			page.getByRole("heading", { name: "Data Source Management" }),
		).toBeVisible();

		// Current Data Sources section (always visible)
		await expect(page.getByText("Current Data Sources")).toBeVisible();

		// Add New Data Sources section
		await expect(
			page.getByRole("heading", { name: "Add New Data Sources" }),
		).toBeVisible();

		// Verify tab navigation for adding sources
		await expect(
			page.getByRole("button", { name: "File Upload" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "GitHub URL" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Browse Repositories" }),
		).toBeVisible();

		// Verify upload interface is visible by default
		await expect(page.getByText("Upload JSON Files")).toBeVisible();
		await expect(page.getByText("Drag & drop JSON test files")).toBeVisible();
	});

	test("navigation tabs work correctly", async ({ page }) => {
		await page.goto("/data");

		// Test File Upload tab (default)
		await expect(page.getByText("Upload JSON Files")).toBeVisible();
		await expect(page.getByText("Drag & drop JSON test files")).toBeVisible();

		// Test GitHub URL tab
		await page.getByRole("button", { name: "GitHub URL" }).click();
		await expect(page.getByText("Load from GitHub URL")).toBeVisible();

		// Test Browse Repositories tab
		await page.getByRole("button", { name: "Browse Repositories" }).click();
		await expect(page.getByText("GitHub Repository Browser")).toBeVisible();

		// Test going back to File Upload
		await page.getByRole("button", { name: "File Upload" }).click();
		await expect(page.getByText("Upload JSON Files")).toBeVisible();
	});

	test("data persistence across page navigation", async ({ page }) => {
		// Load data on data management page
		await page.goto("/data");
		await page.getByRole("button", { name: "Load Built-in Data" }).click();
		await expect(page.getByText("Built-in Test Data")).toBeVisible();

		// Navigate to browse page
		await page
			.getByRole("button", { name: "Browse and filter test cases" })
			.click();
		await expect(
			page.getByRole("heading", { name: "Browse Tests" }),
		).toBeVisible();

		// Navigate back to data management page
		await page
			.getByRole("button", { name: "Manage test data from multiple sources" })
			.click();

		// Verify data source is still present
		await expect(page.getByText("Built-in Test Data")).toBeVisible();
		await expect(page.getByText("Combined Data Summary")).toBeVisible();
		await expect(page.getByText("1 of 1 source active")).toBeVisible();
	});

	test("accessibility features work correctly", async ({ page }) => {
		await page.goto("/data");

		// Load built-in data to get interactive elements
		await page.getByRole("button", { name: "Load Built-in Data" }).click();
		await expect(page.getByText("Built-in Test Data")).toBeVisible();

		// Test keyboard navigation to toggle button
		await page.keyboard.press("Tab");
		let tabCount = 0;
		while (tabCount < 20) {
			const focused = await page.locator(":focus").getAttribute("aria-label");
			if (focused?.includes("Deactivate source")) {
				break;
			}
			await page.keyboard.press("Tab");
			tabCount++;
		}

		// Test keyboard activation of toggle
		await page.keyboard.press("Enter");
		await expect(
			page.getByRole("button", { name: "Activate source" }),
		).toBeVisible();

		// Verify ARIA labels are present
		const toggleButton = page.getByRole("button", {
			name: "Activate source",
		});
		const ariaLabel = await toggleButton.getAttribute("aria-label");
		expect(ariaLabel).toBeTruthy();
		expect(ariaLabel).toContain("Activate source");

		// Verify titles/tooltips are present on buttons
		const loadButton = page.getByRole("button", { name: "Load Built-in Data" });
		const title = await loadButton.getAttribute("title");
		expect(title).toBeTruthy();
	});

	test("responsive design works on mobile viewport", async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		await page.goto("/data");
		await page.getByRole("button", { name: "Load Built-in Data" }).click();

		// Verify mobile layout doesn't break
		await expect(page.getByText("Data Source Management")).toBeVisible();
		await expect(page.getByText("Built-in Test Data")).toBeVisible();

		// Verify toggle button works on mobile
		await page.getByRole("button", { name: "Deactivate source" }).click();
		await expect(
			page.getByRole("button", { name: "Activate source" }),
		).toBeVisible();

		// Verify tabs work on mobile
		await page.getByRole("button", { name: "GitHub URL" }).click();
		await expect(page.getByText("Load from GitHub URL")).toBeVisible();
	});

	test("handles multiple rapid interactions gracefully", async ({ page }) => {
		await page.goto("/data");

		// Rapidly click load button multiple times
		const loadButton = page.getByRole("button", { name: "Load Built-in Data" });
		await loadButton.click();
		await loadButton.click();
		await loadButton.click();

		// Should only load once
		await expect(page.getByText("Built-in Test Data")).toBeVisible();
		await expect(page.getByText("1 of 1 source active")).toBeVisible();

		// Rapidly toggle the data source
		const toggleButton = page.getByRole("button", {
			name: "Deactivate source",
		});
		await toggleButton.click();
		await toggleButton.click();
		await toggleButton.click();

		// Should end up in a consistent state
		const finalToggle = page.getByRole("button", {
			name: /activate source|deactivate source/i,
		});
		await expect(finalToggle).toBeVisible();
	});
});
