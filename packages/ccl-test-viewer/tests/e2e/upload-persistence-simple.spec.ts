import { expect, test } from "@playwright/test";
import { unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

test.describe("Upload and Data Persistence - Core Functionality", () => {
	// Simple test data that matches the CCL test format
	const testData = [
		{
			name: "test-basic-parsing",
			input: "key=value\\nother=data",
			validation: "function:parse",
			expected: {
				count: 2,
				entries: [
					{ key: "key", value: "value" },
					{ key: "other", value: "data" },
				],
			},
			functions: ["parse"],
			features: [],
			behaviors: [],
			variants: [],
			source_test: "test-upload.json",
		},
	];

	let testFilePath: string;

	test.beforeEach(async ({ page }) => {
		// Create temporary test file
		testFilePath = join(tmpdir(), `test-upload-${Date.now()}.json`);
		writeFileSync(testFilePath, JSON.stringify(testData, null, 2));

		// Clear localStorage before each test
		await page.goto("/");
		await page.evaluate(() => {
			localStorage.clear();
		});
	});

	test.afterEach(async () => {
		// Clean up test file
		try {
			unlinkSync(testFilePath);
		} catch (error) {
			// File may not exist, ignore error
		}
	});

	test("core workflow: upload file and verify persistence across pages", async ({
		page,
	}) => {
		// Step 1: Go to upload page
		await page.goto("/upload");
		await expect(
			page.getByRole("heading", { name: "Load Test Data" }),
		).toBeVisible();

		// Step 2: Upload the JSON file
		await page
			.getByRole("button", { name: /upload json files by dragging/i })
			.click();
		await page.setInputFiles('input[type="file"]', testFilePath);

		// Step 3: Wait for upload to complete and verify success
		await expect(page.getByText("Uploaded Files (1)")).toBeVisible({
			timeout: 10000,
		});

		// Look for the success badge specifically
		const successBadge = page
			.locator("span")
			.filter({ hasText: "success" })
			.first();
		await expect(successBadge).toBeVisible();

		// Step 4: Verify data summary appears
		await expect(page.getByText("Combined Data Summary")).toBeVisible();

		// Step 5: Navigate to Browse page
		await page
			.getByRole("button", { name: /browse and filter test cases/i })
			.click();

		// Step 6: Wait for browse page to load and verify data persisted
		await expect(
			page.getByRole("heading", { name: "Browse Tests" }),
		).toBeVisible();

		// Wait for data to load - check for the test case itself rather than just count
		await expect(
			page.getByRole("button", { name: /view test case.*test-basic-parsing/i }),
		).toBeVisible({ timeout: 10000 });

		// Step 7: Verify the uploaded data badge
		await expect(page.getByText("Uploaded Data")).toBeVisible();

		// Step 8: Navigate back to upload page to verify data is still there
		// Close any open sidebar overlay that might interfere with navigation
		const overlay = page.locator(".fixed.inset-0.bg-black.bg-opacity-50");
		if (await overlay.isVisible()) {
			await overlay.click();
		}

		await page
			.getByRole("button", { name: /upload json test data files/i })
			.click();
		await expect(page.getByText("Combined Data Summary")).toBeVisible();
	});

	test("upload validation works correctly", async ({ page }) => {
		// Create invalid JSON file
		const invalidFilePath = join(tmpdir(), `invalid-${Date.now()}.json`);
		writeFileSync(invalidFilePath, "{ invalid json content");

		try {
			await page.goto("/upload");
			await page
				.getByRole("button", { name: /upload json files by dragging/i })
				.click();
			await page.setInputFiles('input[type="file"]', invalidFilePath);

			// Should show error status
			await expect(page.getByText("Uploaded Files (1)")).toBeVisible({
				timeout: 10000,
			});

			// Look for error badge
			const errorBadge = page
				.locator("span")
				.filter({ hasText: "error" })
				.first();
			await expect(errorBadge).toBeVisible();
		} finally {
			// Clean up invalid file
			try {
				unlinkSync(invalidFilePath);
			} catch (error) {
				// Ignore cleanup errors
			}
		}
	});

	test("clear data functionality works", async ({ page }) => {
		// Upload data first
		await page.goto("/upload");
		await page
			.getByRole("button", { name: /upload json files by dragging/i })
			.click();
		await page.setInputFiles('input[type="file"]', testFilePath);
		await expect(page.getByText("Combined Data Summary")).toBeVisible({
			timeout: 10000,
		});

		// Clear all data
		await page
			.getByRole("button", { name: /clear all imported data/i })
			.click();

		// Verify data is cleared
		await expect(page.getByText("Combined Data Summary")).not.toBeVisible();
		await expect(page.getByText("Getting Started")).toBeVisible();
	});
});
