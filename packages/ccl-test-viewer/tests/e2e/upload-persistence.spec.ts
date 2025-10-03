import { expect, test } from "@playwright/test";
import { unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

test.describe("Upload and Data Persistence", () => {
	// Test data that matches the CCL test format
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
		{
			name: "test-object-construction",
			input: "user.name=John\\nuser.age=30",
			validation: "function:make-objects",
			expected: {
				count: 1,
				entries: [
					{
						user: {
							name: "John",
							age: "30",
						},
					},
				],
			},
			functions: ["parse", "make-objects"],
			features: ["dotted-keys"],
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

		// Clear localStorage before each test and wait for app to initialize
		await page.goto("/");
		await page.evaluate(() => {
			localStorage.clear();
		});
		// Small delay to ensure localStorage is cleared
		await page.waitForTimeout(100);
	});

	test.afterEach(async () => {
		// Clean up test file
		try {
			unlinkSync(testFilePath);
		} catch (error) {
			// File may not exist, ignore error
		}
	});

	test("complete upload → persist → browse workflow", async ({ page }) => {
		// Step 1: Start at upload page
		await page.goto("/upload");
		await expect(
			page.getByRole("heading", { name: "Load Test Data" }),
		).toBeVisible();

		// Step 2: Upload JSON file
		await page
			.getByRole("button", { name: /upload json files by dragging/i })
			.click();
		await page.setInputFiles('input[type="file"]', testFilePath);

		// Step 3: Verify upload success
		await expect(page.getByText("Uploaded Files (1)")).toBeVisible();
		await expect(
			page
				.locator(".inline-flex.items-center.rounded-full.border")
				.filter({ hasText: "success" }),
		).toBeVisible();
		await expect(page.getByText("2 tests, test-upload")).toBeVisible();

		// Step 4: Verify Combined Data Summary appears
		await expect(page.getByText("Combined Data Summary")).toBeVisible();
		await expect(page.getByText("2", { exact: true }).first()).toBeVisible(); // Total Tests
		await expect(page.getByText("3", { exact: true }).first()).toBeVisible(); // Total Assertions

		// Step 5: Navigate to Browse page
		await page
			.getByRole("button", { name: /browse and filter test cases/i })
			.click();

		// Step 6: Verify data persisted and displays correctly
		await expect(
			page.getByRole("heading", { name: "Browse Tests" }),
		).toBeVisible();

		// Wait for data loading by checking for specific elements that indicate data is loaded
		await page.waitForTimeout(2000); // Give time for initialization

		// Verify test count shows uploaded data (more specific selector)
		await expect(
			page
				.locator("p.text-muted-foreground")
				.filter({ hasText: /2 of 2 tests/ }),
		).toBeVisible();

		// Verify "Uploaded Data" badge appears
		await expect(page.getByText("Uploaded Data")).toBeVisible();

		// Step 7: Verify individual test cases are displayed
		await expect(
			page.getByRole("button", { name: /view test case.*test-basic-parsing/i }),
		).toBeVisible();
		await expect(
			page.getByRole("button", {
				name: /view test case.*test-object-construction/i,
			}),
		).toBeVisible();

		// Step 8: Verify filter sidebar shows correct data
		await expect(page.getByText("parse")).toBeVisible();
		await expect(page.getByText("2", { exact: true })).toBeVisible(); // Function count

		// Verify category filter shows uploaded source
		await expect(page.getByText(/test-upload.*Test Upload/)).toBeVisible();

		// Step 9: Test that a specific test can be viewed
		await page
			.getByRole("button", { name: /view test case.*test-basic-parsing/i })
			.click();
		await expect(page.getByText("key=value")).toBeVisible();
		await expect(page.getByText("other=data")).toBeVisible();
	});

	test("data persists across page refresh", async ({ page }) => {
		// Upload data first
		await page.goto("/upload");
		await page
			.getByRole("button", { name: /upload json files by dragging/i })
			.click();
		await page.setInputFiles('input[type="file"]', testFilePath);

		// Verify upload success
		await expect(
			page
				.locator(".inline-flex.items-center.rounded-full.border")
				.filter({ hasText: "success" }),
		).toBeVisible();

		// Navigate to browse page
		await page
			.getByRole("button", { name: /browse and filter test cases/i })
			.click();
		await expect(
			page
				.locator("p.text-muted-foreground")
				.filter({ hasText: /2 of 2 tests/ }),
		).toBeVisible();

		// Refresh the page
		await page.reload();

		// Verify data still persists after refresh
		await expect(
			page
				.locator("p.text-muted-foreground")
				.filter({ hasText: /2 of 2 tests/ }),
		).toBeVisible();
		await expect(page.getByText("Uploaded Data")).toBeVisible();
		await expect(
			page.getByRole("button", { name: /view test case.*test-basic-parsing/i }),
		).toBeVisible();
	});

	test("data persists when navigating back to upload page", async ({
		page,
	}) => {
		// Upload data
		await page.goto("/upload");
		await page
			.getByRole("button", { name: /upload json files by dragging/i })
			.click();
		await page.setInputFiles('input[type="file"]', testFilePath);
		await expect(
			page
				.locator(".inline-flex.items-center.rounded-full.border")
				.filter({ hasText: "success" }),
		).toBeVisible();

		// Navigate to browse page
		await page
			.getByRole("button", { name: /browse and filter test cases/i })
			.click();
		await expect(
			page
				.locator("p.text-muted-foreground")
				.filter({ hasText: /2 of 2 tests/ }),
		).toBeVisible();

		// Navigate back to upload page
		await page
			.getByRole("button", { name: /upload json test data files/i })
			.click();

		// Verify data summary still shows on upload page
		await expect(page.getByText("Combined Data Summary")).toBeVisible();
		await expect(page.getByText("2", { exact: true }).first()).toBeVisible(); // Total Tests
		await expect(page.getByText("1 of 1 source active")).toBeVisible();
	});

	test("multiple file upload works correctly", async ({ page }) => {
		// Create second test file
		const secondTestData = [
			{
				name: "test-additional",
				input: "additional=test",
				validation: "function:parse",
				expected: {
					count: 1,
					entries: [{ key: "additional", value: "test" }],
				},
				functions: ["parse"],
				features: [],
				behaviors: [],
				variants: [],
				source_test: "additional-test.json",
			},
		];
		const secondFilePath = join(tmpdir(), `additional-test-${Date.now()}.json`);
		writeFileSync(secondFilePath, JSON.stringify(secondTestData, null, 2));

		try {
			await page.goto("/upload");

			// Upload first file
			await page
				.getByRole("button", { name: /upload json files by dragging/i })
				.click();
			await page.setInputFiles('input[type="file"]', testFilePath);
			await expect(page.getByText("Uploaded Files (1)")).toBeVisible();

			// Upload second file
			await page
				.getByRole("button", { name: /upload json files by dragging/i })
				.click();
			await page.setInputFiles('input[type="file"]', secondFilePath);
			await expect(page.getByText("Uploaded Files (2)")).toBeVisible();

			// Verify combined stats
			await expect(page.getByText("3", { exact: true }).first()).toBeVisible(); // Total Tests (2 + 1)

			// Navigate to browse and verify all tests
			await page
				.getByRole("button", { name: /browse and filter test cases/i })
				.click();
			await page.waitForTimeout(2000); // Give time for initialization
			await expect(
				page
					.locator("p.text-muted-foreground")
					.filter({ hasText: /3 of 3 tests/ }),
			).toBeVisible();
		} finally {
			// Clean up second file
			try {
				unlinkSync(secondFilePath);
			} catch (error) {
				// Ignore cleanup errors
			}
		}
	});

	test("localStorage data structure is correct", async ({ page }) => {
		// Upload data
		await page.goto("/upload");
		await page
			.getByRole("button", { name: /upload json files by dragging/i })
			.click();
		await page.setInputFiles('input[type="file"]', testFilePath);
		await expect(
			page
				.locator(".inline-flex.items-center.rounded-full.border")
				.filter({ hasText: "success" }),
		).toBeVisible();

		// Wait for data to be processed and saved to localStorage
		await page.waitForTimeout(1000);

		// Check localStorage structure
		const localStorageData = await page.evaluate(() => {
			const data = localStorage.getItem("ccl-test-viewer-data-sources");
			return data ? JSON.parse(data) : null;
		});

		// Verify localStorage structure
		expect(localStorageData).toBeTruthy();
		expect(localStorageData.dataSources).toBeDefined();
		expect(Array.isArray(localStorageData.dataSources)).toBe(true);
		expect(localStorageData.dataSources.length).toBe(1);
		expect(localStorageData.timestamp).toBeDefined();

		// Verify data source structure
		const dataSource = localStorageData.dataSources[0];
		expect(dataSource.type).toBe("uploaded");
		expect(dataSource.active).toBe(true);
		expect(dataSource.categories).toBeDefined();
		expect(dataSource.stats).toBeDefined();
		expect(dataSource.stats.totalTests).toBe(2);
	});

	test("clear all data functionality works", async ({ page }) => {
		// Upload data
		await page.goto("/upload");
		await page
			.getByRole("button", { name: /upload json files by dragging/i })
			.click();
		await page.setInputFiles('input[type="file"]', testFilePath);
		await expect(
			page
				.locator(".inline-flex.items-center.rounded-full.border")
				.filter({ hasText: "success" }),
		).toBeVisible();

		// Clear all data
		await page
			.getByRole("button", { name: /clear all imported data/i })
			.click();

		// Verify data is cleared on upload page
		await expect(page.getByText("Combined Data Summary")).not.toBeVisible();
		await expect(page.getByText("Getting Started")).toBeVisible();

		// Navigate to browse page and verify no data
		await page
			.getByRole("button", { name: /browse and filter test cases/i })
			.click();
		await expect(page.getByText("No data available")).toBeVisible();
	});

	test("invalid JSON file shows proper error", async ({ page }) => {
		// Create invalid JSON file
		const invalidFilePath = join(tmpdir(), `invalid-${Date.now()}.json`);
		writeFileSync(invalidFilePath, "{ invalid json }");

		try {
			await page.goto("/upload");
			await page
				.getByRole("button", { name: /upload json files by dragging/i })
				.click();
			await page.setInputFiles('input[type="file"]', invalidFilePath);

			// Should show error status
			await expect(page.getByText("error")).toBeVisible();
			await expect(page.getByText(/Invalid JSON/i)).toBeVisible();
		} finally {
			// Clean up invalid file
			try {
				unlinkSync(invalidFilePath);
			} catch (error) {
				// Ignore cleanup errors
			}
		}
	});
});
