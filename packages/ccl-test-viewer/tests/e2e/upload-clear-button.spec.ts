import { expect, test } from "@playwright/test";
import { unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

test.describe("Upload UI - Clear All Button Functionality", () => {
	// Test data that matches the CCL test format
	const testData1 = [
		{
			name: "test-file-1",
			input: "key1=value1\\nother1=data1",
			validation: "function:parse",
			expected: {
				count: 2,
				entries: [
					{ key: "key1", value: "value1" },
					{ key: "other1", value: "data1" },
				],
			},
			functions: ["parse"],
			features: [],
			behaviors: [],
			variants: [],
			source_test: "test-file-1.json",
		},
	];

	const testData2 = [
		{
			name: "test-file-2",
			input: "key2=value2\\nother2=data2",
			validation: "function:parse",
			expected: {
				count: 2,
				entries: [
					{ key: "key2", value: "value2" },
					{ key: "other2", value: "data2" },
				],
			},
			functions: ["parse"],
			features: [],
			behaviors: [],
			variants: [],
			source_test: "test-file-2.json",
		},
	];

	let testFile1Path: string;
	let testFile2Path: string;
	let invalidFilePath: string;

	test.beforeEach(async ({ page }) => {
		// Create temporary test files
		testFile1Path = join(tmpdir(), `test-clear-1-${Date.now()}.json`);
		testFile2Path = join(tmpdir(), `test-clear-2-${Date.now()}.json`);
		invalidFilePath = join(tmpdir(), `test-invalid-${Date.now()}.json`);

		writeFileSync(testFile1Path, JSON.stringify(testData1, null, 2));
		writeFileSync(testFile2Path, JSON.stringify(testData2, null, 2));
		writeFileSync(invalidFilePath, "{ invalid json content");

		// Navigate to upload page and clear any existing state
		await page.goto("/upload");
		await page.evaluate(() => {
			localStorage.clear();
		});
	});

	test.afterEach(async () => {
		// Clean up test files
		for (const filePath of [testFile1Path, testFile2Path, invalidFilePath]) {
			try {
				unlinkSync(filePath);
			} catch (error) {
				// File may not exist, ignore error
			}
		}
	});

	test("clear all button removes all uploaded files from the queue", async ({
		page,
	}) => {
		// Step 1: Upload multiple files
		await page
			.getByRole("button", { name: /upload json files by dragging/i })
			.click();
		await page.setInputFiles('input[type="file"]', [
			testFile1Path,
			testFile2Path,
		]);

		// Step 2: Wait for both files to be uploaded and processed
		await expect(page.getByText("Uploaded Files (2)")).toBeVisible({
			timeout: 10000,
		});

		// Verify both files are listed (use more specific selectors to avoid collisions)
		await expect(
			page
				.locator("p.text-sm.font-medium.truncate")
				.filter({ hasText: testFile1Path.split("/").pop() || "test-clear-1" }),
		).toBeVisible();
		await expect(
			page
				.locator("p.text-sm.font-medium.truncate")
				.filter({ hasText: testFile2Path.split("/").pop() || "test-clear-2" }),
		).toBeVisible();

		// Step 3: Click the "Clear All" button in the upload UI
		await page.getByTestId("upload-clear-all-button").click();

		// Step 4: Verify all files are removed from the upload queue
		await expect(page.getByText("Uploaded Files")).not.toBeVisible();
		await expect(
			page
				.locator("p.text-sm.font-medium.truncate")
				.filter({ hasText: testFile1Path.split("/").pop() || "test-clear-1" }),
		).not.toBeVisible();
		await expect(
			page
				.locator("p.text-sm.font-medium.truncate")
				.filter({ hasText: testFile2Path.split("/").pop() || "test-clear-2" }),
		).not.toBeVisible();

		// Step 5: Verify the upload UI is back to initial state
		await expect(page.getByText("Drag & drop JSON test files")).toBeVisible();
		await expect(page.getByText("or click to browse files")).toBeVisible();
	});

	test("clear all button works with mixed success and error files", async ({
		page,
	}) => {
		// Step 1: Upload one valid and one invalid file
		await page
			.getByRole("button", { name: /upload json files by dragging/i })
			.click();
		await page.setInputFiles('input[type="file"]', [
			testFile1Path,
			invalidFilePath,
		]);

		// Step 2: Wait for files to be processed
		await expect(page.getByText("Uploaded Files (2)")).toBeVisible({
			timeout: 10000,
		});

		// Step 3: Verify we have one success and one error
		const successBadge = page.locator("span").filter({ hasText: "success" });
		const errorBadge = page.locator("span").filter({ hasText: "error" });
		await expect(successBadge).toBeVisible();
		await expect(errorBadge).toBeVisible();

		// Step 4: Click the "Clear All" button in the upload UI
		await page.getByTestId("upload-clear-all-button").click();

		// Step 5: Verify all files (both success and error) are cleared
		await expect(page.getByText("Uploaded Files")).not.toBeVisible();
		await expect(successBadge).not.toBeVisible();
		await expect(errorBadge).not.toBeVisible();
	});

	test("clear all button appears only when files are uploaded", async ({
		page,
	}) => {
		// Step 1: Initially, Clear All button should not be visible
		await expect(page.getByTestId("upload-clear-all-button")).not.toBeVisible();

		// Step 2: Upload a file
		await page
			.getByRole("button", { name: /upload json files by dragging/i })
			.click();
		await page.setInputFiles('input[type="file"]', testFile1Path);

		// Step 3: Wait for file to be uploaded
		await expect(page.getByText("Uploaded Files (1)")).toBeVisible({
			timeout: 10000,
		});

		// Step 4: Now Clear All button should be visible
		await expect(page.getByTestId("upload-clear-all-button")).toBeVisible();

		// Step 5: Click Clear All
		await page.getByTestId("upload-clear-all-button").click();

		// Step 6: Clear All button should disappear again
		await expect(page.getByTestId("upload-clear-all-button")).not.toBeVisible();
	});

	test("clear all button works after multiple operations", async ({ page }) => {
		// Step 1: Upload files and clear them
		await page
			.getByRole("button", { name: /upload json files by dragging/i })
			.click();
		await page.setInputFiles('input[type="file"]', [
			testFile1Path,
			testFile2Path,
		]);
		await expect(page.getByText("Uploaded Files (2)")).toBeVisible({
			timeout: 10000,
		});
		await page.getByTestId("upload-clear-all-button").click();

		// Step 2: Upload files again
		await page
			.getByRole("button", { name: /upload json files by dragging/i })
			.click();
		await page.setInputFiles('input[type="file"]', [testFile1Path]);
		await expect(page.getByText("Uploaded Files (1)")).toBeVisible({
			timeout: 10000,
		});

		// Step 3: Clear All should still work after previous operations
		await page.getByTestId("upload-clear-all-button").click();
		await expect(page.getByText("Uploaded Files")).not.toBeVisible();

		// Step 4: Verify the upload UI is back to initial state
		await expect(page.getByText("Drag & drop JSON test files")).toBeVisible();
	});

	test("clear all button does not affect data persistence in other parts of app", async ({
		page,
	}) => {
		// Step 1: Upload and process a file to create persistent data
		await page
			.getByRole("button", { name: /upload json files by dragging/i })
			.click();
		await page.setInputFiles('input[type="file"]', testFile1Path);
		await expect(page.getByText("Combined Data Summary")).toBeVisible({
			timeout: 10000,
		});

		// Step 2: Clear the upload queue
		await page.getByTestId("upload-clear-all-button").click();
		await expect(page.getByText("Uploaded Files")).not.toBeVisible();

		// Step 3: Verify that processed data summary is still there
		await expect(page.getByText("Combined Data Summary")).toBeVisible();

		// Step 4: Navigate to browse page to verify data persistence
		await page
			.getByRole("button", { name: /browse and filter test cases/i })
			.click();
		await expect(
			page.getByRole("heading", { name: "Browse Tests" }),
		).toBeVisible();
		await expect(page.getByText("Uploaded Data")).toBeVisible();
	});
});
